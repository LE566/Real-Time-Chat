const { Message, User } = require('../models');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getMessages = async (req, res) => {
    try {
        const { room } = req.params;
        const messages = await Message.find({ room })
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(messages.reverse());
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getPrivateMessages = async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        const ids = [userId, otherUserId].sort();
        const privateRoom = `private_${ids[0]}_${ids[1]}`;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: otherUserId },
                { sender: otherUserId, recipient: userId },
                { room: privateRoom }
            ]
        })
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(messages.reverse());
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getLastMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: { $exists: true, $ne: null } },
                { recipient: userId },
                { room: { $regex: `^private_.*${userId}.*` } }
            ]
        })
            .populate('sender', 'username avatar')
            .populate('recipient', 'username avatar')
            .sort({ createdAt: -1 });

        const conversationMap = new Map();
        // Also count unread per conversation
        const unreadMap = new Map();

        for (const msg of messages) {
            const senderId = msg.sender._id?.toString() || msg.sender.toString();
            const recipientId = msg.recipient?._id?.toString() || msg.recipient?.toString();
            const senderName = msg.sender.username || 'Unknown';

            let otherUserId;
            if (senderId === userId) {
                otherUserId = recipientId;
            } else {
                otherUserId = senderId;
            }

            if (!otherUserId && msg.room) {
                const parts = msg.room.replace('private_', '').split('_');
                otherUserId = parts.find(p => p !== userId);
            }

            if (!otherUserId) continue;

            // Count unread: messages FROM other user that I haven't read
            if (senderId !== userId) {
                const isRead = msg.readBy && msg.readBy.some(id => id.toString() === userId);
                if (!isRead) {
                    unreadMap.set(otherUserId, (unreadMap.get(otherUserId) || 0) + 1);
                }
            }

            // Keep only the last message per conversation
            if (!conversationMap.has(otherUserId)) {
                const isMe = senderId === userId;
                const readByMe = msg.readBy && msg.readBy.some(id => id.toString() === userId);
                conversationMap.set(otherUserId, {
                    otherUserId,
                    content: msg.type === 'image' ? '📷 Image' : msg.content,
                    createdAt: msg.createdAt,
                    sender: senderId,
                    senderName: isMe ? null : senderName,
                    isMe,
                    readByMe: isMe ? true : readByMe
                });
            }
        }

        // Attach unread counts
        const result = Array.from(conversationMap.values()).map(conv => ({
            ...conv,
            unreadCount: unreadMap.get(conv.otherUserId) || 0
        }));

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.uploadImage = async (req, res) => {
    try {
        const fileStr = req.body.data;
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            upload_preset: 'ml_default',
        });
        res.json({ url: uploadResponse.secure_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong' });
    }
};

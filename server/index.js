const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { Message, User } = require('./models');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect Database
connectDB();

// Init Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Define Routes
app.use('/api', require('./routes/api'));

// Track userId -> socketId mapping
const userSocketMap = new Map();

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Register user with their socket
    socket.on('register_user', (userId) => {
        userSocketMap.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on('send_message', async (data) => {
        const { sender, content, type, room, recipient } = data;

        const newMessage = new Message({
            sender,
            content,
            type,
            room,
            recipient: recipient || undefined,
            readBy: [sender] // Sender has "read" their own message
        });
        await newMessage.save();

        const populatedMessage = await newMessage.populate('sender', 'username avatar');

        if (room) {
            io.to(room).emit('receive_message', populatedMessage);
        }
    });

    // Typing event — relays username to the room
    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', {
            room: data.room,
            user: data.user,
            username: data.username
        });
    });

    // Read receipts
    socket.on('mark_read', async (data) => {
        const { messageIds, userId, room } = data;
        try {
            await Message.updateMany(
                { _id: { $in: messageIds } },
                { $addToSet: { readBy: userId } }
            );
            // Notify the room that messages were read
            socket.to(room).emit('messages_read', {
                messageIds,
                readBy: userId,
                room
            });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    });

    socket.on('disconnect', () => {
        // Clean up user mapping
        if (socket.userId) {
            userSocketMap.delete(socket.userId);
        }
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

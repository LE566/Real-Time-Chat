import { Component, OnInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonFooter, IonItem, IonButton, IonButtons,
    IonIcon, IonTextarea, IonBackButton, IonPopover
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline, send, happyOutline, checkmarkDoneOutline, checkmarkOutline } from 'ionicons/icons';
import { SocketService } from '../../services/socket.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { Subscription } from 'rxjs';

const EMOJI_LIST = [
    '😀', '😂', '🤣', '😍', '😘', '🥰', '😎', '🤔',
    '😢', '😭', '😡', '🥺', '😱', '🤯', '🥳', '😴',
    '👍', '👎', '👋', '🤝', '🙌', '💪', '🙏', '✌️',
    '❤️', '🔥', '💯', '⭐', '🎉', '🎊', '💀', '👀',
    '😈', '👻', '🤡', '💩', '🤮', '🤧', '😷', '🤒',
    '🍕', '🍔', '🌮', '🍿', '☕', '🍺', '🎂', '🍩',
    '⚽', '🏀', '🎮', '🎵', '📱', '💻', '🚗', '✈️',
];

@Component({
    selector: 'app-chat-room',
    templateUrl: './chat-room.page.html',
    styleUrls: ['./chat-room.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonFooter, IonItem, IonButton, IonButtons,
        IonIcon, IonTextarea, IonBackButton, IonPopover,
    ],
})
export class ChatRoomPage implements OnInit, OnDestroy {
    @ViewChild(IonContent) content!: IonContent;
    messages: any[] = [];
    messageInput = '';
    chatId = '';
    chatName = '';
    isRoom = false;
    currentUserId = '';
    currentUsername = '';
    typingUser = '';
    showEmojiPicker = false;
    emojis = EMOJI_LIST;

    private otherUserId = '';
    private typingTimeout: any;
    private msgSub!: Subscription;
    private typingSub!: Subscription;
    private readSub!: Subscription;

    constructor(
        private route: ActivatedRoute,
        private socketService: SocketService,
        private chatService: ChatService,
        private authService: AuthService,
        private photoService: PhotoService
    ) {
        addIcons({ imageOutline, send, happyOutline, checkmarkDoneOutline, checkmarkOutline });
        this.currentUserId = this.authService.currentUserId ?? '';
        this.currentUsername = this.authService.currentUsername ?? '';
    }

    ngOnInit() {
        this.chatId = this.route.snapshot.paramMap.get('id')!;
        this.route.queryParams.subscribe((params) => {
            this.chatName = params['name'];
            this.isRoom = params['isRoom'] === 'true';
        });

        if (this.isRoom) {
            this.chatService.getChatHistory(this.chatId).subscribe((msgs: any) => {
                this.messages = msgs;
                this.scrollToBottom();
                this.markUnreadMessages();
            });
            this.socketService.joinRoom(this.chatId);
        } else {
            this.otherUserId = this.chatId;
            this.chatService.getPrivateChatHistory(this.otherUserId).subscribe((msgs: any) => {
                this.messages = msgs;
                this.scrollToBottom();
                this.markUnreadMessages();
            });
            const ids = [this.currentUserId, this.otherUserId].sort();
            const privateRoom = `private_${ids[0]}_${ids[1]}`;
            this.socketService.joinRoom(privateRoom);
            this.chatId = privateRoom;
        }

        this.msgSub = this.socketService.getMessages().subscribe((msg: any) => {
            this.messages.push(msg);
            this.scrollToBottom();
            // Mark incoming messages as read immediately
            if (msg.sender._id !== this.currentUserId && msg.sender !== this.currentUserId) {
                this.socketService.markAsRead([msg._id], this.currentUserId, this.chatId);
            }
        });

        this.typingSub = this.socketService.onTyping().subscribe((data: any) => {
            if (data.room === this.chatId && data.user !== this.currentUserId) {
                this.typingUser = `${data.username} está escribiendo...`;
                clearTimeout(this.typingTimeout);
                this.typingTimeout = setTimeout(() => (this.typingUser = ''), 3000);
            }
        });

        this.readSub = this.socketService.onMessagesRead().subscribe((data: any) => {
            if (data.room === this.chatId) {
                data.messageIds.forEach((id: string) => {
                    const msg = this.messages.find((m) => m._id === id);
                    if (msg) {
                        if (!msg.readBy) msg.readBy = [];
                        if (!msg.readBy.includes(data.readBy)) {
                            msg.readBy.push(data.readBy);
                        }
                    }
                });
            }
        });
    }

    ngOnDestroy() {
        this.msgSub?.unsubscribe();
        this.typingSub?.unsubscribe();
        this.readSub?.unsubscribe();
    }

    sendMessage() {
        if (!this.messageInput.trim()) return;
        const payload: any = {
            sender: this.currentUserId,
            content: this.messageInput,
            type: 'text' as const,
            room: this.chatId,
        };
        if (!this.isRoom && this.otherUserId) {
            payload.recipient = this.otherUserId;
        }
        this.socketService.sendMessage(payload);
        this.messageInput = '';
        this.showEmojiPicker = false;
    }

    async sendImage() {
        try {
            const base64 = await this.photoService.addNewReceiver();
            if (base64) {
                this.chatService.uploadImage(base64).subscribe({
                    next: (res: any) => {
                        const payload: any = {
                            sender: this.currentUserId,
                            content: res.url,
                            type: 'image' as const,
                            room: this.chatId,
                        };
                        if (!this.isRoom && this.otherUserId) {
                            payload.recipient = this.otherUserId;
                        }
                        this.socketService.sendMessage(payload);
                    },
                    error: (err) => {
                        console.error('Upload error:', JSON.stringify(err));
                        alert('Error uploading image');
                    },
                });
            }
        } catch (err) {
            console.error('Image error:', err);
        }
    }

    onTyping() {
        this.socketService.emitTyping(this.chatId, this.currentUserId, this.currentUsername);
    }

    toggleEmojiPicker() {
        this.showEmojiPicker = !this.showEmojiPicker;
    }

    addEmoji(emoji: string) {
        this.messageInput += emoji;
    }

    isMyMessage(msg: any): boolean {
        return msg.sender._id === this.currentUserId || msg.sender === this.currentUserId;
    }

    isRead(msg: any): boolean {
        if (!msg.readBy || msg.readBy.length <= 1) return false;
        // Read by someone other than the sender
        return msg.readBy.some((id: string) => id !== this.currentUserId);
    }

    private markUnreadMessages() {
        const unreadIds = this.messages
            .filter((m) => {
                const senderId = m.sender._id || m.sender;
                return senderId !== this.currentUserId && (!m.readBy || !m.readBy.includes(this.currentUserId));
            })
            .map((m) => m._id);
        if (unreadIds.length > 0) {
            this.socketService.markAsRead(unreadIds, this.currentUserId, this.chatId);
        }
    }

    scrollToBottom() {
        setTimeout(() => this.content?.scrollToBottom(300), 100);
    }
}

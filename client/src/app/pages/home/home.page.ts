import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ViewWillEnter } from '@ionic/angular';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonListHeader, IonItem, IonLabel,
    IonIcon, IonAvatar, IonButton, IonButtons, IonNote, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, peopleOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss'],
    standalone: true,
    imports: [
        CommonModule,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonList, IonListHeader, IonItem, IonLabel,
        IonIcon, IonAvatar, IonButton, IonButtons, IonNote, IonBadge,
    ],
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
    users: any[] = [];
    currentUser: any;
    rooms = ['General', 'Tech', 'Random'];
    lastMessages: Map<string, any> = new Map();
    unreadCounts: Map<string, number> = new Map();
    private msgSub!: Subscription;

    constructor(
        private authService: AuthService,
        private chatService: ChatService,
        private socketService: SocketService,
        private router: Router
    ) {
        addIcons({ logOutOutline, peopleOutline });
    }

    ngOnInit() {
        this.socketService.connect();
        this.currentUser = this.authService.currentUserId;
        if (this.currentUser) {
            this.socketService.registerUser(this.currentUser);
        }

        // Listen for new messages in real-time (only subscribe once)
        this.msgSub = this.socketService.getMessages().subscribe((msg: any) => {
            const senderId = msg.sender._id || msg.sender;
            const senderName = msg.sender.username || 'Unknown';
            const isMe = senderId === this.currentUser;

            let otherUserId: string | undefined;
            if (msg.recipient) {
                const recipientId = typeof msg.recipient === 'object' ? msg.recipient._id : msg.recipient;
                otherUserId = isMe ? recipientId : senderId;
            } else if (msg.room && msg.room.startsWith('private_')) {
                const parts = msg.room.replace('private_', '').split('_');
                otherUserId = parts.find((p: string) => p !== this.currentUser);
            }

            if (otherUserId) {
                this.lastMessages.set(otherUserId, {
                    otherUserId,
                    content: msg.type === 'image' ? '📷 Image' : msg.content,
                    createdAt: msg.createdAt || new Date().toISOString(),
                    sender: senderId,
                    senderName: isMe ? null : senderName,
                    isMe
                });

                if (!isMe) {
                    const current = this.unreadCounts.get(otherUserId) || 0;
                    this.unreadCounts.set(otherUserId, current + 1);
                }
            }
        });
    }

    // Runs every time we navigate back to this page
    ionViewWillEnter() {
        this.loadUsers();
        this.loadLastMessages();
    }

    ngOnDestroy() {
        this.msgSub?.unsubscribe();
    }

    loadUsers() {
        this.chatService.users().subscribe((data: any) => {
            this.users = data.filter((u: any) => u._id !== this.currentUser);
            // Join all private rooms so we receive messages in real-time
            for (const user of this.users) {
                const ids = [this.currentUser, user._id].sort();
                const privateRoom = `private_${ids[0]}_${ids[1]}`;
                this.socketService.joinRoom(privateRoom);
            }
        });
    }

    loadLastMessages() {
        this.chatService.getLastMessages().subscribe((data: any) => {
            for (const msg of data) {
                this.lastMessages.set(msg.otherUserId, msg);
                if (!msg.isMe && msg.unreadCount > 0) {
                    this.unreadCounts.set(msg.otherUserId, msg.unreadCount);
                } else {
                    this.unreadCounts.set(msg.otherUserId, 0);
                }
            }
        });
    }

    getLastMessage(userId: string): string {
        const msg = this.lastMessages.get(userId);
        if (!msg) return 'Tap to chat';

        const content = msg.content || '';
        const isMe = msg.isMe || msg.sender === this.currentUser;
        const prefix = isMe ? 'Tú' : (msg.senderName || '');
        const text = content.length > 30 ? content.substring(0, 30) + '...' : content;

        return prefix ? `${prefix}: ${text}` : text;
    }

    getLastMessageTime(userId: string): string {
        const msg = this.lastMessages.get(userId);
        if (!msg) return '';
        const date = new Date(msg.createdAt);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    hasUnread(userId: string): boolean {
        return (this.unreadCounts.get(userId) || 0) > 0;
    }

    getUnreadCount(userId: string): number {
        return this.unreadCounts.get(userId) || 0;
    }

    logout() {
        this.socketService.disconnect();
        this.authService.logout();
        this.router.navigateByUrl('/login', { replaceUrl: true });
    }

    openChat(user: any) {
        this.unreadCounts.set(user._id, 0);
        this.router.navigate(['/chat', user._id], {
            queryParams: { name: user.username },
        });
    }

    openRoom(room: string) {
        this.socketService.joinRoom(room);
        this.router.navigate(['/chat', room], {
            queryParams: { name: room, isRoom: true },
        });
    }
}

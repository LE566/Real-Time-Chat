import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
    private socket: Socket;
    private messageSubject = new Subject<any>();
    private typingSubject = new Subject<any>();
    private readSubject = new Subject<any>();
    private listenersAttached = false;

    constructor() {
        this.socket = io(environment.apiUrl, { autoConnect: false });
    }

    connect() {
        if (!this.socket.connected) {
            this.socket.connect();
        }
        // Attach listeners only once
        if (!this.listenersAttached) {
            this.socket.on('receive_message', (data) => this.messageSubject.next(data));
            this.socket.on('typing', (data) => this.typingSubject.next(data));
            this.socket.on('messages_read', (data) => this.readSubject.next(data));
            this.listenersAttached = true;
        }
    }

    disconnect() {
        this.socket.disconnect();
        this.listenersAttached = false;
    }

    registerUser(userId: string) {
        this.socket.emit('register_user', userId);
    }

    joinRoom(room: string) {
        this.socket.emit('join_room', room);
    }

    sendMessage(payload: {
        sender: string;
        content: string;
        type: 'text' | 'image';
        room?: string;
        recipient?: string;
    }) {
        this.socket.emit('send_message', payload);
    }

    // Shared observables — multiple subscribers won't conflict
    getMessages(): Observable<any> {
        return this.messageSubject.asObservable();
    }

    onTyping(): Observable<any> {
        return this.typingSubject.asObservable();
    }

    onMessagesRead(): Observable<any> {
        return this.readSubject.asObservable();
    }

    emitTyping(room: string, userId: string, username: string) {
        this.socket.emit('typing', { room, user: userId, username });
    }

    markAsRead(messageIds: string[], userId: string, room: string) {
        this.socket.emit('mark_read', { messageIds, userId, room });
    }
}

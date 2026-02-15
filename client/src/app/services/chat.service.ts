import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    constructor(private http: HttpClient, private authService: AuthService) { }

    getHeaders() {
        return {
            headers: new HttpHeaders({
                'x-auth-token': this.authService.token,
            }),
        };
    }

    getChatHistory(room: string) {
        return this.http.get(`${environment.apiUrl}/api/messages/${room}`, this.getHeaders());
    }

    getPrivateChatHistory(otherUserId: string) {
        return this.http.get(
            `${environment.apiUrl}/api/private-messages/${this.authService.currentUserId}/${otherUserId}`,
            this.getHeaders()
        );
    }

    getLastMessages() {
        return this.http.get(
            `${environment.apiUrl}/api/last-messages/${this.authService.currentUserId}`,
            this.getHeaders()
        );
    }

    users() {
        return this.http.get(`${environment.apiUrl}/api/users`, this.getHeaders());
    }

    uploadImage(base64Image: string) {
        return this.http.post(
            `${environment.apiUrl}/api/upload`,
            { data: base64Image },
            this.getHeaders()
        );
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'my-auth-token';
const USER_KEY = 'my-user-id';
const USERNAME_KEY = 'my-username';

@Injectable({ providedIn: 'root' })
export class AuthService {
    isAuthenticated = new BehaviorSubject<boolean>(false);
    currentUserId: string | null = null;
    currentUsername: string | null = null;
    token = '';

    constructor(private http: HttpClient) {
        this.loadToken();
    }

    async loadToken() {
        const tokenResult = await Preferences.get({ key: TOKEN_KEY });
        const userResult = await Preferences.get({ key: USER_KEY });
        const usernameResult = await Preferences.get({ key: USERNAME_KEY });
        if (tokenResult?.value) {
            this.token = tokenResult.value;
            this.currentUserId = userResult?.value ?? null;
            this.currentUsername = usernameResult?.value ?? null;
            this.isAuthenticated.next(true);
        } else {
            this.isAuthenticated.next(false);
        }
    }

    login(credentials: { username: string; password: string }): Observable<any> {
        return this.http
            .post(`${environment.apiUrl}/api/login`, credentials)
            .pipe(
                switchMap((data: any) => {
                    this.currentUserId = data.user.id;
                    this.currentUsername = data.user.username;
                    this.token = data.token;
                    return from(
                        Promise.all([
                            Preferences.set({ key: TOKEN_KEY, value: data.token }),
                            Preferences.set({ key: USER_KEY, value: data.user.id }),
                            Preferences.set({ key: USERNAME_KEY, value: data.user.username }),
                        ])
                    ).pipe(tap(() => this.isAuthenticated.next(true)));
                })
            );
    }

    register(credentials: { username: string; password: string }): Observable<any> {
        return this.http
            .post(`${environment.apiUrl}/api/register`, credentials)
            .pipe(
                switchMap((data: any) => {
                    this.currentUserId = data.user.id;
                    this.currentUsername = data.user.username;
                    this.token = data.token;
                    return from(
                        Promise.all([
                            Preferences.set({ key: TOKEN_KEY, value: data.token }),
                            Preferences.set({ key: USER_KEY, value: data.user.id }),
                            Preferences.set({ key: USERNAME_KEY, value: data.user.username }),
                        ])
                    ).pipe(tap(() => this.isAuthenticated.next(true)));
                })
            );
    }

    async logout(): Promise<void> {
        this.isAuthenticated.next(false);
        this.token = '';
        this.currentUserId = null;
        this.currentUsername = null;
        await Preferences.remove({ key: TOKEN_KEY });
        await Preferences.remove({ key: USER_KEY });
        await Preferences.remove({ key: USERNAME_KEY });
    }
}

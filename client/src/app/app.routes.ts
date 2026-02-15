import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.page').then((m) => m.LoginPage),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./pages/register/register.page').then((m) => m.RegisterPage),
    },
    {
        path: 'home',
        loadComponent: () =>
            import('./pages/home/home.page').then((m) => m.HomePage),
        canActivate: [AuthGuard],
    },
    {
        path: 'chat/:id',
        loadComponent: () =>
            import('./pages/chat-room/chat-room.page').then((m) => m.ChatRoomPage),
        canActivate: [AuthGuard],
    },
];

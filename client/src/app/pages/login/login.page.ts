import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonInput, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubblesOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule, RouterLink,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonItem, IonInput, IonButton, IonIcon,
    ],
})
export class LoginPage {
    loginForm: FormGroup;

    constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
        addIcons({ chatbubblesOutline });
        this.loginForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });
    }

    login() {
        if (this.loginForm.valid) {
            this.authService.login(this.loginForm.value).subscribe({
                next: () => this.router.navigateByUrl('/home'),
                error: (err) => {
                    console.error('LOGIN ERROR:', JSON.stringify(err));
                    alert('Login failed: ' + (err?.error?.msg || err?.message || 'Unknown error'));
                },
            });
        }
    }
}

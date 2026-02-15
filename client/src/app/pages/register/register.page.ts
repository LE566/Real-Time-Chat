import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonInput, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.page.html',
    styleUrls: ['./register.page.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule, RouterLink,
        IonHeader, IonToolbar, IonTitle, IonContent,
        IonItem, IonInput, IonButton, IonIcon,
    ],
})
export class RegisterPage {
    registerForm: FormGroup;

    constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
        addIcons({ personAddOutline });
        this.registerForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });
    }

    register() {
        if (this.registerForm.valid) {
            this.authService.register(this.registerForm.value).subscribe({
                next: () => this.router.navigateByUrl('/home'),
                error: (err) => {
                    console.error('REGISTER ERROR:', JSON.stringify(err));
                    alert('Registration failed: ' + (err?.error?.msg || err?.message || 'Unknown error'));
                },
            });
        }
    }
}

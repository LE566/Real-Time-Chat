import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class PhotoService {
    constructor() { }

    public async takePhoto(): Promise<string | undefined> {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                quality: 80,
            });
            return photo.dataUrl;
        } catch (err) {
            console.error('Camera error:', err);
            return undefined;
        }
    }

    public async pickFromGallery(): Promise<string | undefined> {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos,
                quality: 80,
            });
            return photo.dataUrl;
        } catch (err) {
            console.error('Gallery error:', err);
            return undefined;
        }
    }

    public async addNewReceiver(): Promise<string | undefined> {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Prompt,
                quality: 80,
            });
            return photo.dataUrl;
        } catch (err) {
            console.error('Photo error:', err);
            return undefined;
        }
    }
}

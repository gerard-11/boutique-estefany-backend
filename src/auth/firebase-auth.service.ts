import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseAuthService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private firebaseProjectId?: string;

  constructor(private configService: ConfigService) {}

  private getFirebaseCredential(): admin.credential.Credential {
    const serviceAccountJson = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );
    const serviceAccountBase64 = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_BASE64',
    );

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      this.firebaseProjectId = serviceAccount.project_id;
      return admin.credential.cert(serviceAccount);
    }

    if (serviceAccountBase64) {
      const decoded = Buffer.from(serviceAccountBase64, 'base64').toString(
        'utf8',
      );
      const serviceAccount = JSON.parse(decoded);
      this.firebaseProjectId = serviceAccount.project_id;
      return admin.credential.cert(serviceAccount);
    }

    const serviceAccountPath = path.join(
      process.cwd(),
      'firebase-adminsdk.json',
    );

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8'),
      );
      this.firebaseProjectId = serviceAccount.project_id;
      return admin.credential.cert(serviceAccount);
    }

    throw new Error(
      'Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment.',
    );
  }

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.app();
      return;
    }

    this.firebaseApp = admin.initializeApp({
      credential: this.getFirebaseCredential(),
    });
  }

  getAuth() {
    return this.firebaseApp.auth();
  }

  getProjectId() {
    return this.firebaseProjectId;
  }
}

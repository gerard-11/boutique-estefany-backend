import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseAuthService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccountPath = path.join(
      process.cwd(),
      'firebase-adminsdk.json',
    );
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  }
  getAuth() {
    return this.firebaseApp.auth();
  }
}

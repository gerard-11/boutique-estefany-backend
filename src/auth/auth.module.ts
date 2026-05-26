import { Module, Global } from '@nestjs/common';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Global()
@Module({
  providers: [FirebaseAuthService, FirebaseAuthGuard],
  exports: [FirebaseAuthService, FirebaseAuthGuard],
})
export class AuthModule {}

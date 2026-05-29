import { Module, Global } from '@nestjs/common';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [FirebaseAuthService, FirebaseAuthGuard, RolesGuard],
  exports: [FirebaseAuthService, FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}

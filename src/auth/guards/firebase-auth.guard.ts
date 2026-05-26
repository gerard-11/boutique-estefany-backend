import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthService } from '../firebase-auth.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedToken = await this.firebaseAuthService
        .getAuth()
        .verifyIdToken(token);
      let user = await this.usersService.findByFirebaseUid(decodedToken.uid);

      if (!user) {
        const email = decodedToken.email || `${decodedToken.uid}@no-email.com`;
        user = await this.usersService.createUserFromFirebase(
          decodedToken.uid,
          email,
          decodedToken.name || 'Usuario',
          decodedToken.picture,
        );
      }

      request.user = user;
      return true;
    } catch (error) {
      console.error('Auth Error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

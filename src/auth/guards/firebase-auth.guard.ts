import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthService } from '../firebase-auth.service';
import { UsersService } from '../../users/users.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { User } from '@prisma/client';

// Definimos una interfaz para el token decodificado para evitar el uso de 'any'
interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    const startsBearer = authHeader?.startsWith('Bearer ');
    const token = startsBearer ? authHeader!.split(' ')[1] : undefined;

    console.log('auth header exists:', !!authHeader);
    console.log('starts Bearer:', startsBearer);
    console.log('token length:', token?.length);
    console.log('firebase project:', this.firebaseAuthService.getProjectId());

    if (!authHeader || !startsBearer || !token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      let decodedToken: DecodedToken;

      let firebaseToken;

      try {
        firebaseToken = await this.firebaseAuthService
          .getAuth()
          .verifyIdToken(token);
        console.log('decoded uid:', firebaseToken.uid);
        console.log('decoded aud:', firebaseToken.aud);
      } catch (error) {
        console.error(
          'Firebase verifyIdToken failed:',
          error.code,
          error.message,
        );
        throw error;
      }

      decodedToken = {
        uid: firebaseToken.uid,
        email: firebaseToken.email,
        name: firebaseToken.name,
        picture: firebaseToken.picture,
      };

      let user: User | null = await this.usersService.findByFirebaseUid(
        decodedToken.uid,
      );

      if (!user) {
        const email = decodedToken.email || `${decodedToken.uid}@no-email.com`;
        user = await this.usersService.createUserFromFirebase(
          decodedToken.uid,
          email,
          decodedToken.name || 'Usuario',
          decodedToken.picture,
        );
      }

      if (!user) {
        throw new UnauthorizedException('User could not be synchronized');
      }

      // Inyectamos el usuario de nuestra DB en la petición
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Auth Error:', (error as Error).message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

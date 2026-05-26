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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      let decodedToken: DecodedToken;

      // --- BYPASS DE DESARROLLO ---
      if (token === 'dev-test-admin') {
        decodedToken = {
          uid: 'dev-admin-123',
          email: 'admin@boutique.com',
          name: 'Admin de Pruebas',
          picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
        };
      } else {
        const firebaseToken = await this.firebaseAuthService
          .getAuth()
          .verifyIdToken(token);

        decodedToken = {
          uid: firebaseToken.uid,
          email: firebaseToken.email,
          name: firebaseToken.name,
          picture: firebaseToken.picture,
        };
      }
      // ----------------------------

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
      console.error('Auth Error:', (error as Error).message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

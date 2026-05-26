import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Controller('auth')
export class AuthController {
  
  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    // Gracias al Guard, req.user contiene el usuario de nuestra base de datos
    return req.user;
  }
}

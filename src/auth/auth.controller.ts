import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { UserResponseDto } from '../users/dtos/user-response.dto';
import { UpdateUserProfileDto } from '../users/dtos/update-user-profile.dto';
import { UsersService } from '../users/users.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private usersService: UsersService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  getProfile(@Request() req: RequestWithUser): UserResponseDto {
    return new UserResponseDto(req.user);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch('complete-profile')
  async completeProfile(
    @Request() req: RequestWithUser,
    @Body() updateDto: UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(req.user.id, updateDto);
    return new UserResponseDto(updatedUser);
  }
}

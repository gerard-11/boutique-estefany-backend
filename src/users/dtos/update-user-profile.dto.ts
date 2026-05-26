import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
} from 'class-validator';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber('MX') 
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  avatarUrl?: string;
}

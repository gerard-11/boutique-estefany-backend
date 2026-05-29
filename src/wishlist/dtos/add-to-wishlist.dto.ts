import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @IsUUID('4')
  @IsNotEmpty()
  productId: string;
}

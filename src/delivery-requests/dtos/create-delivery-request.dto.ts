import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateDeliveryRequestDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  productIds: string[];
}

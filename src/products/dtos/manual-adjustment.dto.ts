import { IsNumber, IsEnum, IsString, IsOptional, Min } from 'class-validator';
import { MovementType } from '@prisma/client';

export class ManualAdjustmentDto {
  @IsNumber()
  quantity: number;

  @IsEnum(MovementType)
  type: MovementType;

  @IsString()
  reason: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  newCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  newPrice?: number;
}

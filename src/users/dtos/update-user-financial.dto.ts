import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Level } from '@prisma/client';

export class UpdateUserFinancialDto {
  @IsEnum(Level, { message: 'El nivel debe ser BRONCE, PLATA u ORO' })
  @IsOptional()
  level?: Level;

  @IsNumber({}, { message: 'El límite de crédito debe ser un número' })
  @Min(0, { message: 'El límite de crédito no puede ser negativo' })
  @IsOptional()
  creditLimit?: number;
}

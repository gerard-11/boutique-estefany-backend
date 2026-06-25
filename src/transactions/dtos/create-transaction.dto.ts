import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @IsEnum(TransactionType, {
    message: 'El tipo debe ser CASH, WEEKLY_CREDIT, LAYAWAY o LOAN',
  })
  @IsNotEmpty({ message: 'El tipo de transacción es obligatorio' })
  type: TransactionType;

  @IsArray({ message: 'Los códigos de barras deben enviarse como una lista' })
  @IsString({ each: true, message: 'Cada código de barras debe ser texto' })
  @IsNotEmpty({
    each: true,
    message: 'El código de barras no puede estar vacío',
  })
  @IsOptional()
  productBarcodes?: string[];

  @IsArray({ message: 'Los IDs de productos deben enviarse como una lista' })
  @IsUUID('4', {
    each: true,
    message: 'Cada ID de producto debe ser un UUID válido',
  })
  @IsNotEmpty({
    each: true,
    message: 'El ID de producto no puede estar vacío',
  })
  @IsOptional()
  productIds?: string[];

  @IsBoolean({ message: 'El campo de aprobación forzada debe ser un booleano' })
  @IsOptional()
  forceApproval?: boolean;

  @IsNumber({}, { message: 'El porcentaje de descuento debe ser un número' })
  @Min(0)
  @IsOptional()
  discountPercentage?: number;
}

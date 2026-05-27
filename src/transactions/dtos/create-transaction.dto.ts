import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @IsEnum(TransactionType, {
    message: 'El tipo debe ser CONTADO, CREDITO_SEMANAL, APARTADO o PRESTAMO',
  })
  @IsNotEmpty({ message: 'El tipo de transacción es obligatorio' })
  type: TransactionType;

  @IsArray({ message: 'Los códigos de barras deben enviarse como una lista' })
  @IsString({ each: true, message: 'Cada código de barras debe ser texto' })
  @IsNotEmpty({ each: true, message: 'El código de barras no puede estar vacío' })
  productBarcodes: string[];

  @IsBoolean({ message: 'El campo de aprobación forzada debe ser un booleano' })
  @IsOptional()
  forceApproval?: boolean;
}

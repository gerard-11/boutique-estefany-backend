import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(1, { message: 'El monto del abono debe ser al menos 1' })
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  amount: number;

  @IsString({ message: 'El método de pago debe ser texto' })
  @IsOptional()
  method?: string; // Efectivo por defecto, o cualquier texto libre.
}

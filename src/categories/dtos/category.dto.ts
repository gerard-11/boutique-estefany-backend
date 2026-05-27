import { IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  name: string;

  @IsUUID('4', { message: 'El ID del departamento debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del departamento es obligatorio' })
  departmentId: string;
}

export class UpdateCategoryDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  name: string;
}

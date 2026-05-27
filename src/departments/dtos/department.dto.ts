import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  name: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}

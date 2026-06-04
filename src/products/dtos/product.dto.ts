import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'El código de barras debe ser texto' })
  @IsNotEmpty({ message: 'El código de barras es obligatorio' })
  @MaxLength(100)
  barcode: string;

  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  size?: string;

  @IsString({ message: 'La unidad de medida debe ser texto' })
  @IsOptional()
  @MaxLength(20)
  sizeUnit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  brand?: string;

  @IsNumber({}, { message: 'El stock debe ser un número' })
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @Min(0)
  price: number;

  @IsNumber({}, { message: 'El costo debe ser un número' })
  @IsOptional()
  @Min(0)
  cost?: number;

  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido' })
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoryName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  departmentName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  imageUrl?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  sizeUnit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  brand?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  imageUrl?: string;
}

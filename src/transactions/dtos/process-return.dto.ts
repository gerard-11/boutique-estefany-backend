import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class DebtRepaymentDto {
  @IsString()
  transactionId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class ProcessReturnDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  cashAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  walletAmount?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DebtRepaymentDto)
  debtRepayments?: DebtRepaymentDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

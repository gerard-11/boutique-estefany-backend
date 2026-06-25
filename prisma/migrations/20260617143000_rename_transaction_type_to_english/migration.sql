-- Rename transaction type enum values to English
ALTER TYPE "TransactionType" RENAME VALUE 'CONTADO' TO 'CASH';
ALTER TYPE "TransactionType" RENAME VALUE 'CREDITO_SEMANAL' TO 'WEEKLY_CREDIT';
ALTER TYPE "TransactionType" RENAME VALUE 'APARTADO' TO 'LAYAWAY';
ALTER TYPE "TransactionType" RENAME VALUE 'PRESTAMO' TO 'LOAN';

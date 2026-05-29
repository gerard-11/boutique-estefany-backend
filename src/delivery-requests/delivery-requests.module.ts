import { Module } from '@nestjs/common';
import { DeliveryRequestsService } from './delivery-requests.service';
import { DeliveryRequestsController } from './delivery-requests.controller';

@Module({
  providers: [DeliveryRequestsService],
  controllers: [DeliveryRequestsController]
})
export class DeliveryRequestsModule {}

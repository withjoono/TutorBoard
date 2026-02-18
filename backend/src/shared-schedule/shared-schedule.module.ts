import { Module } from '@nestjs/common';
import { SharedScheduleService } from './shared-schedule.service';
import { SharedScheduleController } from './shared-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SharedScheduleController],
  providers: [SharedScheduleService],
  exports: [SharedScheduleService],
})
export class SharedScheduleModule {}

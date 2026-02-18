
import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [IntegrationController],
})
export class IntegrationModule { }

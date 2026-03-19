import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';

@Module({
  imports: [AuthModule],
  controllers: [ProcessesController],
  providers: [ProcessesService, PrismaService],
})
export class ProcessesModule {}

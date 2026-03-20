import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { SupervisorEvaluationsController } from './supervisor-evaluations/supervisor-evaluations.controller';
import { SupervisorEvaluationsService } from './supervisor-evaluations/supervisor-evaluations.service';

@Module({
  imports: [AuthModule],
  controllers: [ProcessesController, SupervisorEvaluationsController],
  providers: [ProcessesService, SupervisorEvaluationsService, PrismaService],
})
export class ProcessesModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadCommissionActsController } from './cesad-commission-acts.controller';
import { CesadCommissionActsService } from './cesad-commission-acts.service';
import { CesadCommissionsController } from './cesad-commissions.controller';
import { CesadCommissionsService } from './cesad-commissions.service';

@Module({
  imports: [AuthModule],
  controllers: [CesadCommissionsController, CesadCommissionActsController],
  providers: [CesadCommissionsService, CesadCommissionActsService, PrismaService],
})
export class CesadModule {}

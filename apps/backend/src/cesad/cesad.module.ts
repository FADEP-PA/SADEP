import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadCommissionActsController } from './cesad-commission-acts.controller';
import { CesadCommissionActsService } from './cesad-commission-acts.service';
import { CesadCommissionMembersController } from './cesad-commission-members.controller';
import { CesadCommissionMembersService } from './cesad-commission-members.service';
import { CesadCommissionsController } from './cesad-commissions.controller';
import { CesadCommissionsService } from './cesad-commissions.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CesadCommissionsController,
    CesadCommissionActsController,
    CesadCommissionMembersController,
  ],
  providers: [
    CesadCommissionsService,
    CesadCommissionActsService,
    CesadCommissionMembersService,
    PrismaService,
  ],
})
export class CesadModule {}

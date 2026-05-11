import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadContextAuthorizationService } from './authorization/cesad-context-authorization.service';
import { CesadCommissionActsController } from './cesad-commission-acts.controller';
import { CesadCommissionActsService } from './cesad-commission-acts.service';
import { CesadCommissionMembersController } from './cesad-commission-members.controller';
import { CesadCommissionMembersService } from './cesad-commission-members.service';
import { CesadCommissionsController } from './cesad-commissions.controller';
import { CesadCommissionsService } from './cesad-commissions.service';
import { CesadCurrentCommissionController } from './cesad-current-commission.controller';
import { CesadCurrentCommissionService } from './cesad-current-commission.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CesadCurrentCommissionController,
    CesadCommissionsController,
    CesadCommissionActsController,
    CesadCommissionMembersController,
  ],
  providers: [
    CesadCurrentCommissionService,
    CesadCommissionsService,
    CesadCommissionActsService,
    CesadCommissionMembersService,
    CesadContextAuthorizationService,
    PrismaService,
  ],
})
export class CesadModule {}

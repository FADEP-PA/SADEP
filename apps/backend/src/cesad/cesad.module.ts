import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadCommissionsController } from './cesad-commissions.controller';
import { CesadCommissionsService } from './cesad-commissions.service';

@Module({
  imports: [AuthModule],
  controllers: [CesadCommissionsController],
  providers: [CesadCommissionsService, PrismaService],
})
export class CesadModule {}

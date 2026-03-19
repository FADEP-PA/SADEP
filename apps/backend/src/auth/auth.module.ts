import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PrismaService,
    AppConfigService,
    AppLogger,
    Reflector,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}

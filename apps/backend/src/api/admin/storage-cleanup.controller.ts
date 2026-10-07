import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ListPendingCleanupResponse, ProcessCleanupResponse } from '@sadep/contracts';
import { UserRole } from '@sadep/contracts';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { StorageCleanupService } from '../../infrastructure/storage/storage-cleanup.service';

const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_PAGE_SIZE = 50;

@Controller('admin/storage/cleanup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageCleanupController {
  constructor(private readonly storageCleanupService: StorageCleanupService) {}

  @Post('process')
  @Roles(UserRole.ADMIN)
  async process(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { limit?: number } = {},
  ): Promise<ProcessCleanupResponse> {
    if (!user) throw new ForbiddenException('Authenticated user not found');
    const limit = this.resolveLimit(body.limit);
    return this.storageCleanupService.processPendingCleanups(limit);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  async listPending(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ): Promise<ListPendingCleanupResponse> {
    if (!user) throw new ForbiddenException('Authenticated user not found');
    const limit = this.resolveLimit(Number(limitParam), DEFAULT_PAGE_SIZE);
    const offset = Math.max(0, Number(offsetParam) || 0);
    return this.storageCleanupService.listPending(limit, offset);
  }

  private resolveLimit(raw: number | undefined, fallback: number = DEFAULT_BATCH_LIMIT): number {
    if (raw === undefined || Number.isNaN(raw)) return fallback;
    return Math.max(1, Math.min(1000, Math.floor(raw)));
  }
}

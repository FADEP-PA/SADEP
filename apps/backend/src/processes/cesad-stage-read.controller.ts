import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadStageReadService } from './cesad-stage-read.service';

@Controller('processes/:id/stages')
@UseGuards(JwtAuthGuard)
export class CesadStageReadController {
  constructor(private readonly cesadStageReadService: CesadStageReadService) {}

  @Get(':sequence/consolidated-read')
  async getStageReadSnapshot(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageReadService.getStageReadSnapshot(id, sequence, user);
  }
}

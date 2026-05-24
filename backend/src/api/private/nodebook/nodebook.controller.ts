/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SessionGuard } from '../../../auth/session.guard';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { NodeBookAnalyzeService } from '../../../nodebook/nodebook-analyze.service';
import { OpenApi } from '../../utils/decorators/openapi.decorator';
import { RequestUserId } from '../../utils/decorators/request-user-id.decorator';
import { NodeBookAnalyzeDto } from './nodebook-analyze.dto';

@UseGuards(SessionGuard)
@OpenApi(401)
@ApiTags('nodebook')
@Controller('nodebook')
export class NodeBookController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private readonly analyzeService: NodeBookAnalyzeService,
  ) {
    this.logger.setContext(NodeBookController.name);
  }

  @Get('status')
  @OpenApi(200)
  getStatus(): { configured: boolean; nlpService: boolean; llmApi: boolean } {
    return this.analyzeService.getStatus();
  }

  @Post('analyze')
  @HttpCode(200)
  @OpenApi(200, 400, 500)
  async analyze(
    @RequestUserId() userId: number,
    @Body() dto: NodeBookAnalyzeDto,
  ): Promise<unknown> {
    if (!this.analyzeService.isConfigured()) {
      throw new HttpException('LLM service is not configured', HttpStatus.NOT_IMPLEMENTED);
    }

    this.logger.log(
      `User ${userId} analyzing text (${dto.text.length} chars, categories: ${dto.categories.join(',')})`,
    );

    try {
      return await this.analyzeService.analyze(dto.text, dto.categories);
    } catch (error) {
      this.logger.error(`Analysis failed for user ${userId}: ${(error as Error).message}`);
      throw new HttpException('Text analysis failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

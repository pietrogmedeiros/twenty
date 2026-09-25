import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isNonEmptyString } from '@sniptt/guards';
import { timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { PrecaturFollowUpService } from 'src/modules/precatur-follow-up/services/precatur-follow-up.service';
import { getChatwootIncomingMessagePhone } from 'src/modules/precatur-follow-up/utils/get-chatwoot-incoming-message-phone.util';

const isSameSecret = (received: string, expected: string) => {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

// Webhook do Chatwoot (evento message_created): cliente respondeu no
// WhatsApp → para o follow-up dos negócios com aquele telefone.
// URL: /webhooks/precatur/chatwoot/<workspaceId>?token=<PRECATUR_CHATWOOT_WEBHOOK_TOKEN>
@Controller()
export class PrecaturChatwootWebhookController {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly precaturFollowUpService: PrecaturFollowUpService,
  ) {}

  @Post(['webhooks/precatur/chatwoot/:workspaceId'])
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @HttpCode(200)
  async handleChatwootWebhook(
    @Param('workspaceId') workspaceId: string,
    @Query('token') token: string | undefined,
    @Body() body: Parameters<typeof getChatwootIncomingMessagePhone>[0],
  ) {
    const expectedToken = this.twentyConfigService.get(
      'PRECATUR_CHATWOOT_WEBHOOK_TOKEN',
    );

    if (
      !isNonEmptyString(expectedToken) ||
      !isNonEmptyString(token) ||
      !isSameSecret(token, expectedToken)
    ) {
      throw new ForbiddenException('Invalid webhook token');
    }

    const workspaceExists = await this.workspaceRepository.existsBy({
      id: workspaceId,
    });

    if (!workspaceExists) {
      throw new NotFoundException('Workspace not found');
    }

    const phone = getChatwootIncomingMessagePhone(body);

    if (phone === null) {
      return { ignored: true };
    }

    const repliedDeals = await this.precaturFollowUpService.markRepliedByPhone(
      workspaceId,
      phone,
    );

    return { repliedDeals };
  }
}

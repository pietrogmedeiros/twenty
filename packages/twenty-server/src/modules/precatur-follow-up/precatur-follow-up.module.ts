import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PrecaturChatwootWebhookController } from 'src/modules/precatur-follow-up/controllers/precatur-chatwoot-webhook.controller';
import { PrecaturFollowUpCronCommand } from 'src/modules/precatur-follow-up/crons/commands/precatur-follow-up.cron.command';
import { PrecaturFollowUpCronJob } from 'src/modules/precatur-follow-up/crons/jobs/precatur-follow-up.cron.job';
import { PrecaturFollowUpStageListener } from 'src/modules/precatur-follow-up/listeners/precatur-follow-up-stage.listener';
import { PrecaturChatwootService } from 'src/modules/precatur-follow-up/services/precatur-chatwoot.service';
import { PrecaturFollowUpService } from 'src/modules/precatur-follow-up/services/precatur-follow-up.service';

// Precatur: follow-up automático por WhatsApp (Chatwoot, API oficial) dos
// negócios em "Em negociação" — dias 1, 3 e 7, para quando o cliente responde.
@Module({
  imports: [
    SecureHttpClientModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  controllers: [PrecaturChatwootWebhookController],
  providers: [
    PrecaturChatwootService,
    PrecaturFollowUpService,
    PrecaturFollowUpStageListener,
    PrecaturFollowUpCronJob,
    PrecaturFollowUpCronCommand,
  ],
  exports: [PrecaturFollowUpCronCommand],
})
export class PrecaturFollowUpModule {}

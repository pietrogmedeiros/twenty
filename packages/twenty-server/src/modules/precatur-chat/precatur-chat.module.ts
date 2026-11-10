import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PrecaturChatMentionNotificationJob } from 'src/modules/precatur-chat/jobs/precatur-chat-mention-notification.job';
import { PrecaturChatMessageListener } from 'src/modules/precatur-chat/listeners/precatur-chat-message.listener';
import { PrecaturChatSystemMessageService } from 'src/modules/precatur-chat/services/precatur-chat-system-message.service';

// Precatur: avisos do chat interno por registro (menções por e-mail)
@Module({
  imports: [
    WorkspaceDomainsModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  providers: [
    PrecaturChatMessageListener,
    PrecaturChatMentionNotificationJob,
    PrecaturChatSystemMessageService,
  ],
  exports: [PrecaturChatSystemMessageService],
})
export class PrecaturChatModule {}

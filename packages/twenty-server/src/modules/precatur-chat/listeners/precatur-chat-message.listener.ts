import { Injectable } from '@nestjs/common';

import { type ObjectRecordCreateEvent } from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from 'src/modules/precatur-chat/constants/precatur-chat-object-names.constant';
import {
  PrecaturChatMentionNotificationJob,
  type PrecaturChatMentionNotificationJobData,
  type PrecaturChatMessageRecord,
} from 'src/modules/precatur-chat/jobs/precatur-chat-mention-notification.job';

@Injectable()
export class PrecaturChatMessageListener {
  constructor(
    @InjectMessageQueue(MessageQueue.emailQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnDatabaseBatchEvent(
    PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
    DatabaseEventAction.CREATED,
  )
  async handleCreatedEvent(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<PrecaturChatMessageRecord>
    >,
  ) {
    for (const event of payload.events) {
      const message = event.properties.after;
      const mentionedWorkspaceMemberIds = Array.isArray(
        message.mentionedWorkspaceMemberIds,
      )
        ? message.mentionedWorkspaceMemberIds
        : [];

      if (mentionedWorkspaceMemberIds.length === 0) {
        continue;
      }

      await this.messageQueueService.add<PrecaturChatMentionNotificationJobData>(
        PrecaturChatMentionNotificationJob.name,
        {
          workspaceId: payload.workspaceId,
          message,
          authorWorkspaceMemberId: isDefined(event.workspaceMemberId)
            ? event.workspaceMemberId
            : null,
        },
      );
    }
  }
}

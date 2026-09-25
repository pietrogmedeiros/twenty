import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import {
  PRECATUR_FOLLOW_UP_OBJECT_NAME,
  PRECATUR_FOLLOW_UP_STAGE_FIELD_NAME,
  PRECATUR_FOLLOW_UP_STAGE_VALUE,
} from 'src/modules/precatur-follow-up/constants/precatur-follow-up.constants';
import { PrecaturFollowUpService } from 'src/modules/precatur-follow-up/services/precatur-follow-up.service';
import { type PrecaturFollowUpDeal } from 'src/modules/precatur-follow-up/types/precatur-follow-up-deal.type';

// Começa a sequência quando o negócio entra em "Em negociação" (inclusive já
// criado nessa etapa) e para quando sai dela.
@Injectable()
export class PrecaturFollowUpStageListener {
  private readonly logger = new Logger(PrecaturFollowUpStageListener.name);

  constructor(
    private readonly precaturFollowUpService: PrecaturFollowUpService,
  ) {}

  @OnDatabaseBatchEvent(
    PRECATUR_FOLLOW_UP_OBJECT_NAME,
    DatabaseEventAction.CREATED,
  )
  async handleCreatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<PrecaturFollowUpDeal>>,
  ) {
    for (const event of payload.events) {
      const deal = event.properties.after;

      if (deal.status === PRECATUR_FOLLOW_UP_STAGE_VALUE) {
        await this.run(() =>
          this.precaturFollowUpService.startSequence(
            payload.workspaceId,
            deal.id,
          ),
        );
      }
    }
  }

  @OnDatabaseBatchEvent(
    PRECATUR_FOLLOW_UP_OBJECT_NAME,
    DatabaseEventAction.UPDATED,
  )
  async handleUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<PrecaturFollowUpDeal>>,
  ) {
    for (const event of payload.events) {
      if (
        !isDefined(event.properties.diff?.[PRECATUR_FOLLOW_UP_STAGE_FIELD_NAME])
      ) {
        continue;
      }

      const { before, after } = event.properties;

      if (after.status === before.status) {
        continue;
      }

      if (after.status === PRECATUR_FOLLOW_UP_STAGE_VALUE) {
        await this.run(() =>
          this.precaturFollowUpService.startSequence(
            payload.workspaceId,
            after.id,
          ),
        );
      } else if (before.status === PRECATUR_FOLLOW_UP_STAGE_VALUE) {
        await this.run(() =>
          this.precaturFollowUpService.stopSequenceLeftStage(
            payload.workspaceId,
            after.id,
          ),
        );
      }
    }
  }

  private async run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        `Follow-up stage change failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PRECATUR_STAGE_ENTRY_STAGE_FIELD_BY_OBJECT } from 'src/modules/precatur-stage-entry/constants/precatur-stage-entry.constants';
import { PrecaturStageEntryService } from 'src/modules/precatur-stage-entry/services/precatur-stage-entry.service';

type StageRecord = Record<string, unknown> & { id: string };

@Injectable()
export class PrecaturStageEntryListener {
  private readonly logger = new Logger(PrecaturStageEntryListener.name);

  constructor(
    private readonly precaturStageEntryService: PrecaturStageEntryService,
  ) {}

  @OnDatabaseBatchEvent('*', DatabaseEventAction.CREATED)
  async handleCreatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<StageRecord>>,
  ) {
    const stageFieldName = this.getStageFieldName(payload);

    if (!isDefined(stageFieldName)) {
      return;
    }

    await this.stamp(
      payload,
      payload.events
        .map((event) => event.properties.after)
        .filter((record) => isDefined(record[stageFieldName]))
        .map((record) => record.id),
    );
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPDATED)
  async handleUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<StageRecord>>,
  ) {
    const stageFieldName = this.getStageFieldName(payload);

    if (!isDefined(stageFieldName)) {
      return;
    }

    await this.stamp(
      payload,
      payload.events
        .filter(
          (event) =>
            isDefined(event.properties.diff?.[stageFieldName]) &&
            event.properties.before[stageFieldName] !==
              event.properties.after[stageFieldName],
        )
        .map((event) => event.properties.after.id),
    );
  }

  private getStageFieldName(payload: WorkspaceEventBatch<unknown>) {
    return PRECATUR_STAGE_ENTRY_STAGE_FIELD_BY_OBJECT[
      payload.objectMetadata.nameSingular
    ];
  }

  private async stamp(
    payload: WorkspaceEventBatch<unknown>,
    recordIds: string[],
  ) {
    try {
      await this.precaturStageEntryService.stampStageEntry({
        workspaceId: payload.workspaceId,
        objectMetadata: payload.objectMetadata,
        recordIds,
      });
    } catch (error) {
      this.logger.error(
        `Stage entry stamp failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

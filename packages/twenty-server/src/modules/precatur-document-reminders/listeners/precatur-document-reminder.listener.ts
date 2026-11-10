import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PRECATUR_DOCUMENT_REMINDER } from 'src/modules/precatur-document-reminders/constants/precatur-document-reminder.constants';
import { PrecaturDocumentReminderService } from 'src/modules/precatur-document-reminders/services/precatur-document-reminder.service';

type AnalysisRecord = Record<string, unknown> & { id: string };

const { analysisObjectName, stageFieldName, startStage } =
  PRECATUR_DOCUMENT_REMINDER;

// Análise criada ou movida para a Pré Análise → começa a cobrança
@Injectable()
export class PrecaturDocumentReminderListener {
  private readonly logger = new Logger(PrecaturDocumentReminderListener.name);

  constructor(
    private readonly precaturDocumentReminderService: PrecaturDocumentReminderService,
  ) {}

  @OnDatabaseBatchEvent(analysisObjectName, DatabaseEventAction.CREATED)
  async handleCreatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<AnalysisRecord>>,
  ) {
    await this.start(
      payload.workspaceId,
      payload.events
        .map((event) => event.properties.after)
        .filter((record) => record[stageFieldName] === startStage)
        .map((record) => record.id),
    );
  }

  @OnDatabaseBatchEvent(analysisObjectName, DatabaseEventAction.UPDATED)
  async handleUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<AnalysisRecord>>,
  ) {
    await this.start(
      payload.workspaceId,
      payload.events
        .filter(
          (event) =>
            isDefined(event.properties.diff?.[stageFieldName]) &&
            event.properties.before?.[stageFieldName] !== startStage &&
            event.properties.after?.[stageFieldName] === startStage,
        )
        .map((event) => event.properties.after.id),
    );
  }

  private async start(workspaceId: string, analysisIds: string[]) {
    if (analysisIds.length === 0) {
      return;
    }

    try {
      await this.precaturDocumentReminderService.start(
        workspaceId,
        analysisIds,
      );
    } catch (error) {
      // Workspace sem os campos da cobrança (script não rodado) cai aqui
      this.logger.debug(
        `Document reminder not started: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

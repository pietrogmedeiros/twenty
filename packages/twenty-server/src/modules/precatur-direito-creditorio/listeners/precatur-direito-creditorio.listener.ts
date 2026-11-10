import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PRECATUR_DIREITO_CREDITORIO } from 'src/modules/precatur-direito-creditorio/constants/precatur-direito-creditorio.constants';
import { PrecaturDireitoCreditorioService } from 'src/modules/precatur-direito-creditorio/services/precatur-direito-creditorio.service';
import { PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME } from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';

type StageRecord = Record<string, unknown> & { id: string };

const getRecordIdsEnteringStage = (
  payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<StageRecord>>,
  stageFieldName: string,
  stageValue: string,
) =>
  payload.events
    .filter(
      (event) =>
        isDefined(event.properties.diff?.[stageFieldName]) &&
        event.properties.before?.[stageFieldName] !== stageValue &&
        event.properties.after?.[stageFieldName] === stageValue,
    )
    .map((event) => event.properties.after.id);

// Análise → "Direito creditório" abre o card; card → "Virou precatório"
// devolve o negócio ao comercial
@Injectable()
export class PrecaturDireitoCreditorioListener {
  private readonly logger = new Logger(PrecaturDireitoCreditorioListener.name);

  constructor(
    private readonly precaturDireitoCreditorioService: PrecaturDireitoCreditorioService,
  ) {}

  @OnDatabaseBatchEvent(
    PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
    DatabaseEventAction.UPDATED,
  )
  async handleAnalysisUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<StageRecord>>,
  ) {
    for (const analysisId of getRecordIdsEnteringStage(
      payload,
      'status',
      PRECATUR_DIREITO_CREDITORIO.analysisStage,
    )) {
      await this.run(() =>
        this.precaturDireitoCreditorioService.openFromAnalysis(
          payload.workspaceId,
          analysisId,
        ),
      );
    }
  }

  @OnDatabaseBatchEvent(
    PRECATUR_DIREITO_CREDITORIO.objectName,
    DatabaseEventAction.UPDATED,
  )
  async handleDireitoUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<StageRecord>>,
  ) {
    for (const direitoId of getRecordIdsEnteringStage(
      payload,
      PRECATUR_DIREITO_CREDITORIO.stageFieldName,
      PRECATUR_DIREITO_CREDITORIO.becamePrecatorioStage,
    )) {
      await this.run(() =>
        this.precaturDireitoCreditorioService.completeAsPrecatorio(
          payload.workspaceId,
          direitoId,
        ),
      );
    }
  }

  private async run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        `Direito creditório failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

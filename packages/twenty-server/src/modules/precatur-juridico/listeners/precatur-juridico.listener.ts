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
  PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_STAGE_VALUE,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import { PrecaturJuridicoService } from 'src/modules/precatur-juridico/services/precatur-juridico.service';
import {
  type PrecaturJuridicoAnalysis,
  type PrecaturJuridicoDeal,
} from 'src/modules/precatur-juridico/types/precatur-juridico.types';

// Negócio entrou em "Jurídico" → espelha na Análise Jurídica.
// Status da análise mudou → devolve a decisão para o negócio.
@Injectable()
export class PrecaturJuridicoListener {
  private readonly logger = new Logger(PrecaturJuridicoListener.name);

  constructor(
    private readonly precaturJuridicoService: PrecaturJuridicoService,
  ) {}

  @OnDatabaseBatchEvent(
    PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
    DatabaseEventAction.CREATED,
  )
  async handleDealCreatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<PrecaturJuridicoDeal>>,
  ) {
    for (const event of payload.events) {
      const deal = event.properties.after;

      if (deal.status === PRECATUR_JURIDICO_DEAL_STAGE_VALUE) {
        await this.run(() =>
          this.precaturJuridicoService.mirrorDealToJuridico(
            payload.workspaceId,
            deal.id,
          ),
        );
      }
    }
  }

  @OnDatabaseBatchEvent(
    PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
    DatabaseEventAction.UPDATED,
  )
  async handleDealUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<PrecaturJuridicoDeal>>,
  ) {
    for (const event of payload.events) {
      const { before, after } = event.properties;

      if (
        !isDefined(event.properties.diff?.status) ||
        after.status === before.status ||
        after.status !== PRECATUR_JURIDICO_DEAL_STAGE_VALUE
      ) {
        continue;
      }

      await this.run(() =>
        this.precaturJuridicoService.mirrorDealToJuridico(
          payload.workspaceId,
          after.id,
        ),
      );
    }
  }

  @OnDatabaseBatchEvent(
    PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
    DatabaseEventAction.UPDATED,
  )
  async handleAnalysisUpdatedEvent(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<PrecaturJuridicoAnalysis>
    >,
  ) {
    for (const event of payload.events) {
      const { before, after } = event.properties;

      if (
        !isDefined(event.properties.diff?.status) ||
        after.status === before.status ||
        !isDefined(after.negociacaoId)
      ) {
        continue;
      }

      const dealId = after.negociacaoId;

      await this.run(() =>
        this.precaturJuridicoService.syncDecisionToDeal(
          payload.workspaceId,
          dealId,
          after.status,
        ),
      );
    }
  }

  private async run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        `Jurídico mirror failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

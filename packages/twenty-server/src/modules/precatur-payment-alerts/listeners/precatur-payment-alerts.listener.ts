import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';
import { In } from 'typeorm';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import {
  PRECATUR_PAYMENT_ALERT_FIELDS,
  PRECATUR_PAYMENT_ALERT_OBJECT_NAME,
} from 'src/modules/precatur-payment-alerts/constants/precatur-payment-alerts.constants';

type PostPurchaseRecord = Record<string, unknown> & { id: string };

// Precatur: previsão de pagamento mudou → os alertas recomeçam da nova data
@Injectable()
export class PrecaturPaymentAlertsListener {
  private readonly logger = new Logger(PrecaturPaymentAlertsListener.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  @OnDatabaseBatchEvent(
    PRECATUR_PAYMENT_ALERT_OBJECT_NAME,
    DatabaseEventAction.UPDATED,
  )
  async handleUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<PostPurchaseRecord>>,
  ) {
    const dateFieldName = PRECATUR_PAYMENT_ALERT_FIELDS.expectedPaymentDate;
    const recordIds = payload.events
      .filter(
        (event) =>
          event.properties.before?.[dateFieldName] !==
          event.properties.after?.[dateFieldName],
      )
      .map((event) => event.properties.after.id);

    if (recordIds.length === 0) {
      return;
    }

    try {
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const repository =
            await this.globalWorkspaceOrmManager.getRepository<PostPurchaseRecord>(
              payload.workspaceId,
              PRECATUR_PAYMENT_ALERT_OBJECT_NAME,
              { shouldBypassPermissionChecks: true },
            );

          await repository.update(
            { id: In(recordIds) },
            { [PRECATUR_PAYMENT_ALERT_FIELDS.sentAlerts]: [] },
          );
        },
        buildSystemAuthContext(payload.workspaceId),
      );
    } catch (error) {
      this.logger.error(
        `Payment alert reset failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

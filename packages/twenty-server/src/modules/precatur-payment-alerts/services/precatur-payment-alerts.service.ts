import { Injectable, Logger } from '@nestjs/common';

import { IsNull, Not } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  PRECATUR_PAYMENT_ALERT_ACTIVITY_TYPE,
  PRECATUR_PAYMENT_ALERT_FIELDS,
  PRECATUR_PAYMENT_ALERT_OBJECT_NAME,
  PRECATUR_PAYMENT_ALERT_STAGE_FIELD_NAME,
  PRECATUR_PAYMENT_ALERT_STAGE_VALUE,
} from 'src/modules/precatur-payment-alerts/constants/precatur-payment-alerts.constants';
import { getPrecaturDuePaymentAlerts } from 'src/modules/precatur-payment-alerts/utils/get-precatur-due-payment-alerts.util';

type PostPurchaseRecord = {
  id: string;
  name: string | null;
  etapa: string | null;
  previsaoPagamento: string | null;
  alertasPagamentoEnviados: string[] | null;
  responsavelJuridicoId: string | null;
};

const formatBrazilianDate = (isoDate: string) =>
  isoDate.slice(0, 10).split('-').reverse().join('/');

// "Hoje" no fuso de Brasília, no formato do campo DATE
const getTodayInBrazil = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(now);

@Injectable()
export class PrecaturPaymentAlertsService {
  private readonly logger = new Logger(PrecaturPaymentAlertsService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // Workspace sem o Pós-Compra ou sem os campos (ex.: Salvador) lança erro e
  // o cron só registra e segue
  async processPaymentAlerts(workspaceId: string, now = new Date()) {
    const today = getTodayInBrazil(now);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const recordRepository =
        await this.globalWorkspaceOrmManager.getRepository<PostPurchaseRecord>(
          workspaceId,
          PRECATUR_PAYMENT_ALERT_OBJECT_NAME,
          { shouldBypassPermissionChecks: true },
        );

      const records = await recordRepository.find({
        where: {
          [PRECATUR_PAYMENT_ALERT_STAGE_FIELD_NAME]:
            PRECATUR_PAYMENT_ALERT_STAGE_VALUE,
          [PRECATUR_PAYMENT_ALERT_FIELDS.expectedPaymentDate]: Not(IsNull()),
        },
      });

      for (const record of records) {
        if (record.previsaoPagamento === null) {
          continue;
        }

        const sentAlerts = record.alertasPagamentoEnviados ?? [];
        const { alertToNotify, alertsToMark } = getPrecaturDuePaymentAlerts({
          expectedPaymentDate: record.previsaoPagamento,
          sentAlerts,
          today,
        });

        if (alertToNotify === null) {
          continue;
        }

        await this.createTask(workspaceId, record.id, {
          title: `Pagamento previsto em ${alertToNotify.label} — ${record.name ?? 'Pós-Compra'} (previsão ${formatBrazilianDate(record.previsaoPagamento)})`,
          status: 'TODO',
          dueAt: now.toISOString(),
          assigneeId: record.responsavelJuridicoId,
          tipoAtividade: PRECATUR_PAYMENT_ALERT_ACTIVITY_TYPE,
        });

        await recordRepository.update(
          { id: record.id },
          {
            [PRECATUR_PAYMENT_ALERT_FIELDS.sentAlerts]: [
              ...sentAlerts,
              ...alertsToMark.map((milestone) => milestone.value),
            ],
          },
        );

        this.logger.log(
          `Payment alert ${alertToNotify.value} created for ${record.id} in workspace ${workspaceId}`,
        );
      }
    }, buildSystemAuthContext(workspaceId));
  }

  private async createTask(
    workspaceId: string,
    postPurchaseId: string,
    task: {
      title: string;
      status: string;
      dueAt: string;
      assigneeId: string | null;
      tipoAtividade: string;
    },
  ) {
    const taskRepository = await this.globalWorkspaceOrmManager.getRepository<
      typeof task & { id: string }
    >(workspaceId, 'task', { shouldBypassPermissionChecks: true });
    const taskTargetRepository =
      await this.globalWorkspaceOrmManager.getRepository<{
        id: string;
        taskId: string;
        targetAcompanhamentoPosCompraId: string;
      }>(workspaceId, 'taskTarget', { shouldBypassPermissionChecks: true });

    const createdTask = await taskRepository.save(task);

    await taskTargetRepository.save({
      taskId: createdTask.id,
      targetAcompanhamentoPosCompraId: postPurchaseId,
    });
  }
}

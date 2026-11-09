import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PRECATUR_PAYMENT_ALERT_CRON_PATTERN } from 'src/modules/precatur-payment-alerts/constants/precatur-payment-alerts.constants';
import { PrecaturPaymentAlertsService } from 'src/modules/precatur-payment-alerts/services/precatur-payment-alerts.service';

@Processor(MessageQueue.cronQueue)
export class PrecaturPaymentAlertsCronJob {
  private readonly logger = new Logger(PrecaturPaymentAlertsCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly precaturPaymentAlertsService: PrecaturPaymentAlertsService,
  ) {}

  @Process(PrecaturPaymentAlertsCronJob.name)
  @SentryCronMonitor(
    PrecaturPaymentAlertsCronJob.name,
    PRECATUR_PAYMENT_ALERT_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    const activeWorkspaces = await this.workspaceRepository.find({
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
      select: ['id'],
    });

    for (const workspace of activeWorkspaces) {
      try {
        await this.precaturPaymentAlertsService.processPaymentAlerts(
          workspace.id,
        );
      } catch (error) {
        // Workspace sem o Pós-Compra (ex.: Filial Salvador) cai aqui
        this.logger.debug(
          `Skipping payment alerts for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

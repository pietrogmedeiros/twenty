import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PRECATUR_PAYMENT_ALERT_CRON_PATTERN } from 'src/modules/precatur-payment-alerts/constants/precatur-payment-alerts.constants';
import { PrecaturPaymentAlertsCronJob } from 'src/modules/precatur-payment-alerts/crons/jobs/precatur-payment-alerts.cron.job';

@Command({
  name: 'cron:precatur:payment-alerts',
  description:
    'Starts the Precatur payment alerts cron (6, 3 and 1 month before payment, daily)',
})
export class PrecaturPaymentAlertsCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: PrecaturPaymentAlertsCronJob.name,
      data: undefined,
      options: {
        repeat: { pattern: PRECATUR_PAYMENT_ALERT_CRON_PATTERN },
      },
    });
  }
}

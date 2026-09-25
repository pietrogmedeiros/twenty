import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PRECATUR_FOLLOW_UP_CRON_PATTERN } from 'src/modules/precatur-follow-up/constants/precatur-follow-up.constants';
import { PrecaturFollowUpCronJob } from 'src/modules/precatur-follow-up/crons/jobs/precatur-follow-up.cron.job';

@Command({
  name: 'cron:precatur:follow-up',
  description:
    'Starts the Precatur WhatsApp follow-up cron (sends due follow-ups every 15 minutes)',
})
export class PrecaturFollowUpCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: PrecaturFollowUpCronJob.name,
      data: undefined,
      options: {
        repeat: { pattern: PRECATUR_FOLLOW_UP_CRON_PATTERN },
      },
    });
  }
}

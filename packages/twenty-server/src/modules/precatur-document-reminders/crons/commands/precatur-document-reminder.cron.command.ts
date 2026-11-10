import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PRECATUR_DOCUMENT_REMINDER } from 'src/modules/precatur-document-reminders/constants/precatur-document-reminder.constants';
import { PrecaturDocumentReminderCronJob } from 'src/modules/precatur-document-reminders/crons/jobs/precatur-document-reminder.cron.job';

@Command({
  name: 'cron:precatur:document-reminders',
  description:
    'Starts the Precatur pending documents reminder cron (business days)',
})
export class PrecaturDocumentReminderCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: PrecaturDocumentReminderCronJob.name,
      data: undefined,
      options: {
        repeat: { pattern: PRECATUR_DOCUMENT_REMINDER.cronPattern },
      },
    });
  }
}

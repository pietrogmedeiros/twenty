import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PRECATUR_DOCUMENT_REMINDER } from 'src/modules/precatur-document-reminders/constants/precatur-document-reminder.constants';
import { PrecaturDocumentReminderService } from 'src/modules/precatur-document-reminders/services/precatur-document-reminder.service';

@Processor(MessageQueue.cronQueue)
export class PrecaturDocumentReminderCronJob {
  private readonly logger = new Logger(PrecaturDocumentReminderCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly precaturDocumentReminderService: PrecaturDocumentReminderService,
  ) {}

  @Process(PrecaturDocumentReminderCronJob.name)
  @SentryCronMonitor(
    PrecaturDocumentReminderCronJob.name,
    PRECATUR_DOCUMENT_REMINDER.cronPattern,
  )
  async handle(): Promise<void> {
    const activeWorkspaces = await this.workspaceRepository.find({
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
      select: ['id'],
    });

    for (const workspace of activeWorkspaces) {
      try {
        await this.precaturDocumentReminderService.processReminders(
          workspace.id,
        );
      } catch (error) {
        // Workspace sem a Análise Jurídica ou sem os campos cai aqui
        this.logger.debug(
          `Skipping document reminders for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

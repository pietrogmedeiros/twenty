import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PRECATUR_FOLLOW_UP_CRON_PATTERN } from 'src/modules/precatur-follow-up/constants/precatur-follow-up.constants';
import { PrecaturFollowUpService } from 'src/modules/precatur-follow-up/services/precatur-follow-up.service';

@Processor(MessageQueue.cronQueue)
export class PrecaturFollowUpCronJob {
  private readonly logger = new Logger(PrecaturFollowUpCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly precaturFollowUpService: PrecaturFollowUpService,
  ) {}

  @Process(PrecaturFollowUpCronJob.name)
  @SentryCronMonitor(
    PrecaturFollowUpCronJob.name,
    PRECATUR_FOLLOW_UP_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    const activeWorkspaces = await this.workspaceRepository.find({
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
      select: ['id'],
    });

    for (const workspace of activeWorkspaces) {
      try {
        await this.precaturFollowUpService.processDueFollowUps(workspace.id);
      } catch (error) {
        // Workspace sem o objeto negociacao (ex.: Filial Salvador) cai aqui
        this.logger.debug(
          `Skipping follow-ups for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

import { Logger, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { In, Repository } from 'typeorm';

import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { escapeHtml } from 'src/engine/core-modules/emailing-domain/utils/escape-html.util';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export type PrecaturChatMessageRecord = {
  id: string;
  body?: string | null;
  targetObjectNameSingular?: string | null;
  targetRecordId?: string | null;
  targetRecordLabel?: string | null;
  mentionedWorkspaceMemberIds?: string[] | null;
  createdBy?: { workspaceMemberId?: string | null; name?: string | null };
};

export type PrecaturChatMentionNotificationJobData = {
  workspaceId: string;
  message: PrecaturChatMessageRecord;
  authorWorkspaceMemberId: string | null;
};

@Processor({
  queueName: MessageQueue.emailQueue,
  scope: Scope.REQUEST,
})
export class PrecaturChatMentionNotificationJob {
  private readonly logger = new Logger(PrecaturChatMentionNotificationJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  @Process(PrecaturChatMentionNotificationJob.name)
  async handle(data: PrecaturChatMentionNotificationJobData): Promise<void> {
    const { workspaceId, message } = data;
    const authorWorkspaceMemberId =
      message.createdBy?.workspaceMemberId ?? data.authorWorkspaceMemberId;

    // Quem escreveu não precisa ser avisado da própria menção
    const recipientIds = [
      ...new Set(message.mentionedWorkspaceMemberIds ?? []),
    ].filter((memberId) => memberId !== authorWorkspaceMemberId);

    if (recipientIds.length === 0) {
      return;
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!isDefined(workspace)) {
      return;
    }

    const recipients =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const workspaceMemberRepository =
            await this.globalWorkspaceOrmManager.getRepository<WorkspaceMemberWorkspaceEntity>(
              workspaceId,
              'workspaceMember',
              { shouldBypassPermissionChecks: true },
            );

          return workspaceMemberRepository.find({
            where: { id: In(recipientIds) },
          });
        },
        buildSystemAuthContext(workspaceId),
      );

    const authorName = message.createdBy?.name ?? 'Alguém';
    const recordLabel = message.targetRecordLabel ?? 'um registro';
    const recordUrl =
      isDefined(message.targetObjectNameSingular) &&
      isDefined(message.targetRecordId)
        ? this.workspaceDomainsService
            .buildWorkspaceURL({
              workspace,
              pathname: `/object/${message.targetObjectNameSingular}/${message.targetRecordId}`,
            })
            .toString()
        : null;

    const subject = `${authorName} mencionou você no chat de ${recordLabel}`;
    const body = message.body ?? '';
    const text = `${subject}\n\n"${body}"${isDefined(recordUrl) ? `\n\nAbrir: ${recordUrl}` : ''}`;
    const html = [
      `<p><strong>${escapeHtml(authorName)}</strong> mencionou você no chat de <strong>${escapeHtml(recordLabel)}</strong>:</p>`,
      `<blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;white-space:pre-wrap">${escapeHtml(body)}</blockquote>`,
      isDefined(recordUrl)
        ? `<p><a href="${escapeHtml(recordUrl)}">Abrir conversa no CRM</a></p>`
        : '',
    ].join('');

    for (const recipient of recipients) {
      if (!isDefined(recipient.userEmail)) {
        continue;
      }

      try {
        await this.emailService.send({
          from: `${authorName} (via CRM) <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
          to: recipient.userEmail,
          subject,
          text,
          html,
        });
      } catch (error) {
        this.logger.warn(
          `Falha ao enfileirar e-mail de menção para ${recipient.id}: ${error}`,
        );
      }
    }
  }
}

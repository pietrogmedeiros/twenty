import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { In, LessThanOrEqual } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  PRECATUR_FOLLOW_UP_CALL_ACTIVITY_TYPE,
  PRECATUR_FOLLOW_UP_DAYS,
  PRECATUR_FOLLOW_UP_OBJECT_NAME,
  PRECATUR_FOLLOW_UP_STAGE_VALUE,
  PRECATUR_FOLLOW_UP_STATUS,
  PRECATUR_FOLLOW_UP_TASK_ACTIVITY_TYPE,
} from 'src/modules/precatur-follow-up/constants/precatur-follow-up.constants';
import { PrecaturChatwootService } from 'src/modules/precatur-follow-up/services/precatur-chatwoot.service';
import {
  type PrecaturFollowUpDeal,
  type PrecaturFollowUpPerson,
} from 'src/modules/precatur-follow-up/types/precatur-follow-up-deal.type';
import { computePrecaturFollowUpNextAt } from 'src/modules/precatur-follow-up/utils/compute-precatur-follow-up-next-at.util';
import {
  getPrecaturPhoneMatchKey,
  toPrecaturE164Phone,
} from 'src/modules/precatur-follow-up/utils/normalize-precatur-phone.util';

const DUE_DEALS_BATCH_SIZE = 50;

type PrecaturFollowUpTask = {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  assigneeId: string | null;
  tipoAtividade?: string;
};

@Injectable()
export class PrecaturFollowUpService {
  private readonly logger = new Logger(PrecaturFollowUpService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly precaturChatwootService: PrecaturChatwootService,
  ) {}

  // Negócio entrou em "Em negociação": começa a sequência do zero.
  async startSequence(workspaceId: string, dealId: string, now = new Date()) {
    await this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);

      await dealRepository.update(
        { id: dealId },
        {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.ACTIVE,
          followUpEnviados: 0,
          followUpIniciadoEm: now.toISOString(),
          followUpProximoEm: computePrecaturFollowUpNextAt({
            enteredStageAt: now,
            sentCount: 0,
          }).toISOString(),
        },
      );
    });
  }

  // Saiu da etapa com a sequência rodando: para sem apagar o histórico.
  async stopSequenceLeftStage(workspaceId: string, dealId: string) {
    await this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);

      await dealRepository.update(
        { id: dealId, followUpStatus: PRECATUR_FOLLOW_UP_STATUS.ACTIVE },
        {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.LEFT_STAGE,
          followUpProximoEm: null,
        },
      );
    });
  }

  // Cliente respondeu no WhatsApp: encerra as sequências ativas daquele número.
  async markRepliedByPhone(
    workspaceId: string,
    phone: string,
  ): Promise<number> {
    const matchKey = getPrecaturPhoneMatchKey(phone);

    if (!isDefined(matchKey)) {
      return 0;
    }

    return this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);
      const activeDeals = await dealRepository.find({
        where: { followUpStatus: PRECATUR_FOLLOW_UP_STATUS.ACTIVE },
      });

      const cedentesById = await this.findCedentesById(
        workspaceId,
        activeDeals,
      );

      const repliedDealIds = activeDeals
        .filter(
          (deal) =>
            getPrecaturPhoneMatchKey(
              this.getDealPhone(deal, cedentesById.get(deal.cedenteId ?? '')),
            ) === matchKey,
        )
        .map((deal) => deal.id);

      if (repliedDealIds.length > 0) {
        await dealRepository.update(
          { id: In(repliedDealIds) },
          {
            followUpStatus: PRECATUR_FOLLOW_UP_STATUS.REPLIED,
            followUpProximoEm: null,
          },
        );
      }

      return repliedDealIds.length;
    });
  }

  async processDueFollowUps(workspaceId: string, now = new Date()) {
    await this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);
      const dueDeals = await dealRepository.find({
        where: {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.ACTIVE,
          followUpProximoEm: LessThanOrEqual(now.toISOString()),
        },
        take: DUE_DEALS_BATCH_SIZE,
      });

      if (dueDeals.length === 0) {
        return;
      }

      const cedentesById = await this.findCedentesById(workspaceId, dueDeals);

      for (const deal of dueDeals) {
        try {
          await this.processDeal({
            workspaceId,
            deal,
            cedente: cedentesById.get(deal.cedenteId ?? ''),
            now,
          });
        } catch (error) {
          this.logger.error(
            `Follow-up failed for deal ${deal.id} in workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    });
  }

  private async processDeal({
    workspaceId,
    deal,
    cedente,
    now,
  }: {
    workspaceId: string;
    deal: PrecaturFollowUpDeal;
    cedente: PrecaturFollowUpPerson | undefined;
    now: Date;
  }) {
    const dealRepository = await this.getDealRepository(workspaceId);

    // Segurança extra: o listener já para a sequência ao sair da etapa
    if (deal.status !== PRECATUR_FOLLOW_UP_STAGE_VALUE) {
      await dealRepository.update(
        { id: deal.id },
        {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.LEFT_STAGE,
          followUpProximoEm: null,
        },
      );

      return;
    }

    const sentCount = deal.followUpEnviados ?? 0;
    const enteredStageAt = isNonEmptyString(deal.followUpIniciadoEm)
      ? new Date(deal.followUpIniciadoEm)
      : now;

    if (sentCount >= PRECATUR_FOLLOW_UP_DAYS.length) {
      await this.createTask(workspaceId, deal.id, {
        title: `Ligar para o cliente — ${deal.name ?? 'negócio'} (sem resposta aos follow-ups)`,
        status: 'TODO',
        dueAt: now.toISOString(),
        assigneeId: deal.responsavelComercialId,
        tipoAtividade: PRECATUR_FOLLOW_UP_CALL_ACTIVITY_TYPE,
      });
      await dealRepository.update(
        { id: deal.id },
        {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.FINISHED,
          followUpProximoEm: null,
        },
      );

      return;
    }

    const phoneNumber = toPrecaturE164Phone(this.getDealPhone(deal, cedente));

    if (!isDefined(phoneNumber)) {
      await dealRepository.update(
        { id: deal.id },
        {
          followUpStatus: PRECATUR_FOLLOW_UP_STATUS.NO_PHONE,
          followUpProximoEm: null,
        },
      );

      return;
    }

    const followUpNumber = sentCount + 1;
    const wasSent = await this.sendFollowUp({
      followUpNumber,
      phoneNumber,
      contactName: this.getContactName(deal, cedente),
    });

    await this.createTask(workspaceId, deal.id, {
      title: wasSent
        ? `Follow-up ${followUpNumber} enviado por WhatsApp`
        : `Follow-up ${followUpNumber} (simulação — WhatsApp não enviado)`,
      status: 'DONE',
      dueAt: now.toISOString(),
      assigneeId: deal.responsavelComercialId,
      tipoAtividade: PRECATUR_FOLLOW_UP_TASK_ACTIVITY_TYPE,
    });

    await dealRepository.update(
      { id: deal.id },
      {
        followUpEnviados: followUpNumber,
        followUpProximoEm: computePrecaturFollowUpNextAt({
          enteredStageAt,
          sentCount: followUpNumber,
        }).toISOString(),
      },
    );
  }

  // true = enviado de verdade; false = modo simulação (Chatwoot/templates
  // ainda não configurados), que só registra na timeline.
  private async sendFollowUp({
    followUpNumber,
    phoneNumber,
    contactName,
  }: {
    followUpNumber: number;
    phoneNumber: string;
    contactName: string;
  }): Promise<boolean> {
    const templateName =
      this.precaturChatwootService.getFollowUpTemplateNames()[
        followUpNumber - 1
      ];

    if (
      !this.precaturChatwootService.isConfigured() ||
      !isNonEmptyString(templateName)
    ) {
      return false;
    }

    const firstName = contactName.split(' ')[0];

    await this.precaturChatwootService.sendTemplateMessage({
      phoneNumber,
      contactName,
      templateName,
      templateParams: [firstName],
      content: `Follow-up ${followUpNumber} (template ${templateName})`,
    });

    return true;
  }

  private async createTask(
    workspaceId: string,
    dealId: string,
    task: Omit<PrecaturFollowUpTask, 'id'>,
  ) {
    const taskRepository =
      await this.globalWorkspaceOrmManager.getRepository<PrecaturFollowUpTask>(
        workspaceId,
        'task',
        { shouldBypassPermissionChecks: true },
      );
    const taskTargetRepository =
      await this.globalWorkspaceOrmManager.getRepository<{
        id: string;
        taskId: string;
        targetNegociacaoId: string;
      }>(workspaceId, 'taskTarget', { shouldBypassPermissionChecks: true });

    const createdTask = await taskRepository.save(task);

    await taskTargetRepository.save({
      taskId: createdTask.id,
      targetNegociacaoId: dealId,
    });
  }

  private getDealPhone(
    deal: PrecaturFollowUpDeal,
    cedente: PrecaturFollowUpPerson | undefined,
  ): string | null {
    if (isNonEmptyString(deal.telefone?.trim())) {
      return deal.telefone;
    }

    const cedenteNumber = cedente?.phones?.primaryPhoneNumber;

    if (!isNonEmptyString(cedenteNumber)) {
      return null;
    }

    return `${cedente?.phones?.primaryPhoneCallingCode ?? ''}${cedenteNumber}`;
  }

  private getContactName(
    deal: PrecaturFollowUpDeal,
    cedente: PrecaturFollowUpPerson | undefined,
  ): string {
    const cedenteName = [cedente?.name?.firstName, cedente?.name?.lastName]
      .filter(isNonEmptyString)
      .join(' ');

    return isNonEmptyString(cedenteName) ? cedenteName : (deal.name ?? '');
  }

  private async findCedentesById(
    workspaceId: string,
    deals: PrecaturFollowUpDeal[],
  ): Promise<Map<string, PrecaturFollowUpPerson>> {
    const cedenteIds = deals
      .map((deal) => deal.cedenteId)
      .filter(isNonEmptyString);

    if (cedenteIds.length === 0) {
      return new Map();
    }

    const personRepository =
      await this.globalWorkspaceOrmManager.getRepository<PrecaturFollowUpPerson>(
        workspaceId,
        'person',
        { shouldBypassPermissionChecks: true },
      );

    const cedentes = await personRepository.find({
      where: { id: In(cedenteIds) },
    });

    return new Map(cedentes.map((cedente) => [cedente.id, cedente]));
  }

  private getDealRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository<PrecaturFollowUpDeal>(
      workspaceId,
      PRECATUR_FOLLOW_UP_OBJECT_NAME,
      { shouldBypassPermissionChecks: true },
    );
  }

  private inWorkspace<T>(workspaceId: string, callback: () => Promise<T>) {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      callback,
      buildSystemAuthContext(workspaceId),
    );
  }
}

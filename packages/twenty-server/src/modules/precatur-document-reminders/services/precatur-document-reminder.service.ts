import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { PrecaturChatSystemMessageService } from 'src/modules/precatur-chat/services/precatur-chat-system-message.service';
import {
  getPrecaturChatMemberDisplayName,
  type PrecaturChatMentionedMember,
} from 'src/modules/precatur-chat/utils/build-precatur-chat-system-message.util';
import { PRECATUR_DOCUMENT_REMINDER } from 'src/modules/precatur-document-reminders/constants/precatur-document-reminder.constants';
import { getPrecaturDocumentReminderAction } from 'src/modules/precatur-document-reminders/utils/get-precatur-document-reminder-action.util';
import { getPrecaturSettingWorkspaceMemberId } from 'src/modules/precatur-document-reminders/utils/get-precatur-setting-workspace-member-id.util';
import { PrecaturDocumentFolderService } from 'src/modules/precatur-documents/services/precatur-document-folder.service';
import {
  getPrecaturMissingDocuments,
  isPrecaturDocumentRuleItem,
} from 'src/modules/precatur-documents/utils/get-precatur-missing-documents.util';

type AnalysisRecord = {
  id: string;
  name: string | null;
  status: string | null;
  negociacaoId: string | null;
  precatorioId: string | null;
  cobrancaDocumentos: string | null;
  cobrancaDocumentosEnviadas: number | null;
  cobrancaDocumentosUltimaEm: string | null;
};

type DealRecord = {
  id: string;
  name: string | null;
  responsavelComercialId: string | null;
};

type StageRuleRecord = { id: string; requiredFieldNames: unknown };

const { status } = PRECATUR_DOCUMENT_REMINDER;

// "Hoje" no fuso de Brasília, no formato do campo DATE
const getTodayInBrazil = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    now,
  );

@Injectable()
export class PrecaturDocumentReminderService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly precaturDocumentFolderService: PrecaturDocumentFolderService,
    private readonly precaturChatSystemMessageService: PrecaturChatSystemMessageService,
  ) {}

  // Análise entrou na Pré Análise: (re)começa a contagem. Se os documentos já
  // estiverem na pasta, o cron encerra sem mandar nada.
  async start(workspaceId: string, analysisIds: string[]) {
    await this.inWorkspace(workspaceId, async () => {
      const analysisRepository = await this.getAnalysisRepository(workspaceId);

      await analysisRepository.update(
        { id: In(analysisIds) },
        {
          cobrancaDocumentos: status.active,
          cobrancaDocumentosEnviadas: 0,
          cobrancaDocumentosUltimaEm: null,
        },
      );
    });
  }

  // Workspace sem os campos da cobrança lança erro e o cron só registra e segue
  async processReminders(workspaceId: string, now = new Date()) {
    const today = getTodayInBrazil(now);

    await this.inWorkspace(workspaceId, async () => {
      const analysisRepository = await this.getAnalysisRepository(workspaceId);
      const analyses = await analysisRepository.find({
        where: { cobrancaDocumentos: status.active },
      });

      if (analyses.length === 0) {
        return;
      }

      const folderContext =
        await this.precaturDocumentFolderService.getFolderContext(
          workspaceId,
          PRECATUR_DOCUMENT_REMINDER.analysisObjectName,
        );

      if (!isDefined(folderContext)) {
        return;
      }

      const ruleItems = await this.getRequiredRuleItems(workspaceId);
      const typesByRecordId =
        await this.precaturDocumentFolderService.getDocumentTypesByRecordId({
          workspaceId,
          objectName: PRECATUR_DOCUMENT_REMINDER.analysisObjectName,
          records: analyses as unknown as Record<string, unknown>[],
          folderContext,
        });
      const dealById = await this.getDealsById(workspaceId, analyses);
      const memberById = await this.getMembersById(workspaceId, [
        ...dealById.values(),
      ]);
      const manager = await this.getManager(workspaceId);

      for (const analysis of analyses) {
        const missing = getPrecaturMissingDocuments({
          ruleItems,
          record: analysis as unknown as Record<string, unknown>,
          presentDocumentTypes: typesByRecordId.get(analysis.id) ?? new Set(),
          documentTypeLabelByValue: folderContext.documentTypeLabelByValue,
        });
        const sentCount = analysis.cobrancaDocumentosEnviadas ?? 0;
        const action = getPrecaturDocumentReminderAction({
          isStopped: PRECATUR_DOCUMENT_REMINDER.stopStages.includes(
            analysis.status ?? '',
          ),
          missingCount: missing.length,
          sentCount,
          lastSentOn: analysis.cobrancaDocumentosUltimaEm,
          today,
          maxReminders: PRECATUR_DOCUMENT_REMINDER.maxReminders,
        });

        if (action === 'WAIT') {
          continue;
        }

        if (action === 'RESOLVE' || action === 'CLOSE') {
          await analysisRepository.update(
            { id: analysis.id },
            {
              cobrancaDocumentos:
                action === 'RESOLVE' ? status.resolved : status.closed,
            },
          );
          continue;
        }

        const deal = isDefined(analysis.negociacaoId)
          ? dealById.get(analysis.negociacaoId)
          : undefined;
        const responsible = isDefined(deal?.responsavelComercialId)
          ? memberById.get(deal.responsavelComercialId)
          : undefined;
        const label = deal?.name ?? analysis.name ?? 'Análise Jurídica';
        const missingText = missing.join(', ');

        // Cobrança fica no bate-papo do negócio (é o comercial quem junta os
        // documentos); sem negócio, no da própria análise
        const target = isDefined(deal)
          ? { objectName: 'negociacao', recordId: deal.id }
          : {
              objectName: PRECATUR_DOCUMENT_REMINDER.analysisObjectName,
              recordId: analysis.id,
            };

        if (action === 'REMIND') {
          await this.precaturChatSystemMessageService.post({
            workspaceId,
            targetObjectNameSingular: target.objectName,
            targetRecordId: target.recordId,
            targetRecordLabel: label,
            mentionedMembers: isDefined(responsible) ? [responsible] : [],
            text: `faltam documentos na pasta do precatório de "${label}" para a Due: ${missingText}. Anexe na aba Arquivos (cobrança ${sentCount + 1} de ${PRECATUR_DOCUMENT_REMINDER.maxReminders}).`,
          });

          await analysisRepository.update(
            { id: analysis.id },
            {
              cobrancaDocumentosEnviadas: sentCount + 1,
              cobrancaDocumentosUltimaEm: today,
            },
          );
          continue;
        }

        await this.precaturChatSystemMessageService.post({
          workspaceId,
          targetObjectNameSingular: target.objectName,
          targetRecordId: target.recordId,
          targetRecordLabel: label,
          mentionedMembers: isDefined(manager) ? [manager] : [],
          text: `os documentos de "${label}" seguem pendentes depois de ${PRECATUR_DOCUMENT_REMINDER.maxReminders} dias úteis de cobrança: ${missingText}. Responsável comercial: ${isDefined(responsible) ? getPrecaturChatMemberDisplayName(responsible) : 'não definido'}.`,
        });

        await analysisRepository.update(
          { id: analysis.id },
          {
            cobrancaDocumentos: status.escalated,
            cobrancaDocumentosUltimaEm: today,
          },
        );
      }
    });
  }

  // Documentos exigidos pela regra da Due (ajustável na tela de regras)
  private async getRequiredRuleItems(workspaceId: string) {
    const ruleRepository = await this.globalWorkspaceOrmManager.getRepository<
      StageRuleRecord & Record<string, unknown>
    >(workspaceId, 'regraEtapa', { shouldBypassPermissionChecks: true });
    const rules = await ruleRepository.find({
      where: {
        objectNameSingular: PRECATUR_DOCUMENT_REMINDER.analysisObjectName,
        stageFieldName: PRECATUR_DOCUMENT_REMINDER.stageFieldName,
        stageValue: PRECATUR_DOCUMENT_REMINDER.ruleStage,
      },
    });
    const items = rules
      .flatMap((rule) =>
        Array.isArray(rule.requiredFieldNames) ? rule.requiredFieldNames : [],
      )
      .filter(
        (item): item is string =>
          typeof item === 'string' && isPrecaturDocumentRuleItem(item),
      );

    return items.length > 0
      ? [...new Set(items)]
      : [...PRECATUR_DOCUMENT_REMINDER.fallbackRuleItems];
  }

  private async getDealsById(workspaceId: string, analyses: AnalysisRecord[]) {
    const dealIds = [
      ...new Set(analyses.map((analysis) => analysis.negociacaoId)),
    ].filter(isDefined);

    if (dealIds.length === 0) {
      return new Map<string, DealRecord>();
    }

    const dealRepository =
      await this.globalWorkspaceOrmManager.getRepository<DealRecord>(
        workspaceId,
        'negociacao',
        { shouldBypassPermissionChecks: true },
      );
    const deals = await dealRepository.find({ where: { id: In(dealIds) } });

    return new Map(deals.map((deal) => [deal.id, deal]));
  }

  private async getMembersById(workspaceId: string, deals: DealRecord[]) {
    const memberIds = [
      ...new Set(deals.map((deal) => deal.responsavelComercialId)),
    ].filter(isDefined);

    if (memberIds.length === 0) {
      return new Map<string, PrecaturChatMentionedMember>();
    }

    const memberRepository = await this.getMemberRepository(workspaceId);
    const members = await memberRepository.find({
      where: { id: In(memberIds) },
    });

    return new Map(members.map((member) => [member.id, member]));
  }

  // Gestor comercial: escolhido em Configurações → Regras de etapa
  // (objeto configuracaoPrecatur, valor { workspaceMemberId })
  private async getManager(workspaceId: string) {
    const settingRepository =
      await this.globalWorkspaceOrmManager.getRepository<{
        id: string;
        chave: string | null;
        valor: unknown;
        updatedAt: string;
      }>(workspaceId, PRECATUR_DOCUMENT_REMINDER.settingsObjectName, {
        shouldBypassPermissionChecks: true,
      });
    // Vale a gravação mais recente (a tela usa a mesma ordem)
    const setting = await settingRepository.findOne({
      where: { chave: PRECATUR_DOCUMENT_REMINDER.managerSettingKey },
      order: { updatedAt: 'DESC' },
    });
    const managerId = getPrecaturSettingWorkspaceMemberId(setting?.valor);

    if (!isDefined(managerId)) {
      return null;
    }

    const memberRepository = await this.getMemberRepository(workspaceId);

    return (
      (await memberRepository.findOne({ where: { id: managerId } })) ?? null
    );
  }

  private getMemberRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository<
      PrecaturChatMentionedMember & Record<string, unknown>
    >(workspaceId, 'workspaceMember', { shouldBypassPermissionChecks: true });
  }

  private getAnalysisRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository<AnalysisRecord>(
      workspaceId,
      PRECATUR_DOCUMENT_REMINDER.analysisObjectName,
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

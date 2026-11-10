import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { Not } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { PrecaturChatSystemMessageService } from 'src/modules/precatur-chat/services/precatur-chat-system-message.service';
import { type PrecaturChatMentionedMember } from 'src/modules/precatur-chat/utils/build-precatur-chat-system-message.util';
import { PRECATUR_DIREITO_CREDITORIO } from 'src/modules/precatur-direito-creditorio/constants/precatur-direito-creditorio.constants';
import {
  formatPrecaturCurrency,
  hasPrecaturCurrencyAmount,
  type PrecaturCurrencyValue,
} from 'src/modules/precatur-direito-creditorio/utils/format-precatur-currency.util';
import {
  PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
  PRECATUR_JURIDICO_ANALYSIS_STATUS,
  PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import { buildPrecaturJuridicoSystemActor } from 'src/modules/precatur-juridico/utils/build-precatur-juridico-system-actor.util';

type AnalysisRecord = {
  id: string;
  name: string | null;
  status: string | null;
  negociacaoId: string | null;
  precatorioId: string | null;
  advogadoResponsavelId: string | null;
};

type DireitoCreditorioRecord = {
  id: string;
  name: string | null;
  etapa: string | null;
  analiseJuridicaId: string | null;
  negociacaoId: string | null;
  precatorioId: string | null;
  valorAtualizado: PrecaturCurrencyValue;
};

type DealRecord = {
  id: string;
  name: string | null;
  responsavelComercialId: string | null;
};

@Injectable()
export class PrecaturDireitoCreditorioService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly precaturChatSystemMessageService: PrecaturChatSystemMessageService,
  ) {}

  // Análise foi para "Direito creditório": abre o card (um aberto por análise)
  async openFromAnalysis(workspaceId: string, analysisId: string) {
    await this.inWorkspace(workspaceId, async () => {
      const analysisRepository = await this.getRepository<AnalysisRecord>(
        workspaceId,
        PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
      );
      const direitoRepository =
        await this.getRepository<DireitoCreditorioRecord>(
          workspaceId,
          PRECATUR_DIREITO_CREDITORIO.objectName,
        );

      const analysis = await analysisRepository.findOne({
        where: { id: analysisId },
      });

      if (!isDefined(analysis)) {
        return;
      }

      const openCount = await direitoRepository.count({
        where: {
          analiseJuridicaId: analysisId,
          etapa: Not(PRECATUR_DIREITO_CREDITORIO.becamePrecatorioStage),
        },
      });

      if (openCount > 0) {
        return;
      }

      await direitoRepository.save({
        ...buildPrecaturJuridicoSystemActor(),
        name: analysis.name,
        etapa: PRECATUR_DIREITO_CREDITORIO.firstStage,
        analiseJuridicaId: analysis.id,
        negociacaoId: analysis.negociacaoId,
        precatorioId: analysis.precatorioId,
        responsavelJuridicoId: analysis.advogadoResponsavelId,
      });
    });
  }

  // Virou precatório: valor atualizado vai para o Precatório, a análise é
  // aprovada (o espelho jurídico destrava o negócio) e o comercial é avisado
  async completeAsPrecatorio(workspaceId: string, direitoId: string) {
    await this.inWorkspace(workspaceId, async () => {
      const direitoRepository =
        await this.getRepository<DireitoCreditorioRecord>(
          workspaceId,
          PRECATUR_DIREITO_CREDITORIO.objectName,
        );
      const analysisRepository = await this.getRepository<AnalysisRecord>(
        workspaceId,
        PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
      );

      const direito = await direitoRepository.findOne({
        where: { id: direitoId },
      });

      if (!isDefined(direito)) {
        return;
      }

      const updatedValue = direito.valorAtualizado;

      if (
        isDefined(direito.precatorioId) &&
        hasPrecaturCurrencyAmount(updatedValue)
      ) {
        const precatorioRepository = await this.getRepository<
          Record<string, unknown>
        >(workspaceId, 'precatorio');

        await precatorioRepository.update(
          { id: direito.precatorioId },
          {
            [PRECATUR_DIREITO_CREDITORIO.precatorioUpdatedValueFieldName]: {
              amountMicros: updatedValue.amountMicros,
              currencyCode: updatedValue.currencyCode || 'BRL',
            },
          },
        );
      }

      const analysis = isDefined(direito.analiseJuridicaId)
        ? await analysisRepository.findOne({
            where: { id: direito.analiseJuridicaId },
          })
        : null;

      // Só aprova se o jurídico não mexeu na análise nesse meio-tempo
      if (
        isDefined(analysis) &&
        analysis.status === PRECATUR_DIREITO_CREDITORIO.analysisStage
      ) {
        await analysisRepository.update(
          { id: analysis.id },
          { status: PRECATUR_JURIDICO_ANALYSIS_STATUS.APPROVED },
        );
      }

      const dealId = direito.negociacaoId ?? analysis?.negociacaoId ?? null;

      if (!isDefined(dealId)) {
        return;
      }

      const dealRepository = await this.getRepository<DealRecord>(
        workspaceId,
        PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
      );
      const deal = await dealRepository.findOne({ where: { id: dealId } });

      if (!isDefined(deal)) {
        return;
      }

      const formattedValue = formatPrecaturCurrency(updatedValue);

      await this.precaturChatSystemMessageService.post({
        workspaceId,
        targetObjectNameSingular: PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
        targetRecordId: deal.id,
        targetRecordLabel: deal.name ?? 'Negociação',
        mentionedMembers: await this.findMembers(workspaceId, [
          deal.responsavelComercialId,
        ]),
        text: `o direito creditório "${direito.name ?? deal.name ?? ''}" virou precatório${isDefined(formattedValue) ? ` com valor atualizado de ${formattedValue}` : ''}. A análise jurídica foi aprovada e o negócio está liberado para a proposta.`,
      });
    });
  }

  private async findMembers(
    workspaceId: string,
    memberIds: (string | null)[],
  ): Promise<PrecaturChatMentionedMember[]> {
    const ids = memberIds.filter(isDefined);

    if (ids.length === 0) {
      return [];
    }

    const memberRepository =
      await this.getRepository<PrecaturChatMentionedMember>(
        workspaceId,
        'workspaceMember',
      );

    return Promise.all(
      ids.map((id) => memberRepository.findOne({ where: { id } })),
    ).then((members) => members.filter(isDefined));
  }

  private getRepository<T extends { id: string } | Record<string, unknown>>(
    workspaceId: string,
    objectName: string,
  ) {
    return this.globalWorkspaceOrmManager.getRepository<T>(
      workspaceId,
      objectName,
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

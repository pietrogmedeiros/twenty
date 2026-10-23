import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { IsNull } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
  PRECATUR_JURIDICO_ANALYSIS_STATUS,
  PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_REJECTED_STAGE_VALUE,
  PRECATUR_JURIDICO_DECISION,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import {
  type PrecaturJuridicoAnalysis,
  type PrecaturJuridicoDeal,
} from 'src/modules/precatur-juridico/types/precatur-juridico.types';
import { buildPrecaturJuridicoSystemActor } from 'src/modules/precatur-juridico/utils/build-precatur-juridico-system-actor.util';
import { getPrecaturJuridicoDecision } from 'src/modules/precatur-juridico/utils/get-precatur-juridico-decision.util';

@Injectable()
export class PrecaturJuridicoService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // Negócio entrou em "Jurídico": abre (ou reaproveita) a Análise Jurídica
  // ligada a ele. Reprovada antes volta para a Pré-análise; aprovada continua valendo.
  async mirrorDealToJuridico(workspaceId: string, dealId: string) {
    await this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);
      const analysisRepository = await this.getAnalysisRepository(workspaceId);

      const deal = await dealRepository.findOne({ where: { id: dealId } });

      if (!isDefined(deal)) {
        return;
      }

      const analysis =
        (await this.findLatestAnalysis(analysisRepository, {
          negociacaoId: dealId,
        })) ??
        // Importadas do Bitrix ficaram presas só ao Precatório
        (isDefined(deal.precatorioId)
          ? await this.findLatestAnalysis(analysisRepository, {
              precatorioId: deal.precatorioId,
              negociacaoId: IsNull(),
            })
          : null);

      let analysisStatus: string | null;

      if (isDefined(analysis)) {
        analysisStatus =
          analysis.status === PRECATUR_JURIDICO_ANALYSIS_STATUS.REJECTED
            ? PRECATUR_JURIDICO_ANALYSIS_STATUS.PENDING
            : analysis.status;

        await analysisRepository.update(
          { id: analysis.id },
          { negociacaoId: dealId, status: analysisStatus },
        );
      } else {
        analysisStatus = PRECATUR_JURIDICO_ANALYSIS_STATUS.PENDING;

        await analysisRepository.save({
          ...buildPrecaturJuridicoSystemActor(),
          name: deal.name,
          status: analysisStatus,
          negociacaoId: dealId,
          precatorioId: deal.precatorioId,
        });
      }

      await dealRepository.update(
        { id: dealId },
        { decisaoJuridica: getPrecaturJuridicoDecision(analysisStatus) },
      );
    });
  }

  // Status da análise mudou: reflete a decisão no negócio e, se reprovada,
  // manda o negócio para "Perdido".
  async syncDecisionToDeal(
    workspaceId: string,
    dealId: string,
    analysisStatus: string | null,
  ) {
    await this.inWorkspace(workspaceId, async () => {
      const dealRepository = await this.getDealRepository(workspaceId);
      const decision = getPrecaturJuridicoDecision(analysisStatus);

      await dealRepository.update(
        { id: dealId },
        decision === PRECATUR_JURIDICO_DECISION.REJECTED
          ? {
              decisaoJuridica: decision,
              status: PRECATUR_JURIDICO_DEAL_REJECTED_STAGE_VALUE,
            }
          : { decisaoJuridica: decision },
      );
    });
  }

  private async findLatestAnalysis(
    analysisRepository: Awaited<
      ReturnType<PrecaturJuridicoService['getAnalysisRepository']>
    >,
    where: Record<string, unknown>,
  ): Promise<PrecaturJuridicoAnalysis | null> {
    const [analysis] = await analysisRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return analysis ?? null;
  }

  private getDealRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository<PrecaturJuridicoDeal>(
      workspaceId,
      PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
      { shouldBypassPermissionChecks: true },
    );
  }

  private getAnalysisRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository<PrecaturJuridicoAnalysis>(
      workspaceId,
      PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
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

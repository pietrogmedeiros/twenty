import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_DECISION_FIELD_NAME,
  PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_STAGE_FIELD_NAME,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import {
  type PrecaturJuridicoAnalysis,
  type PrecaturJuridicoDeal,
} from 'src/modules/precatur-juridico/types/precatur-juridico.types';
import { getPrecaturJuridicoDecision } from 'src/modules/precatur-juridico/utils/get-precatur-juridico-decision.util';
import { getPrecaturJuridicoGateBlock } from 'src/modules/precatur-juridico/utils/get-precatur-juridico-gate-block.util';

type StageOption = { value: string; position: number };

// Precatur: o negócio fica preso em "Jurídico" até a Análise Jurídica ligada
// a ele ser aprovada (ou aprovada com ressalvas). A decisão é lida da própria
// análise, não do campo do negócio, para o comercial não conseguir driblar.
@Injectable()
export class PrecaturJuridicoGateService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async validateStageChange({
    authContext,
    recordIds,
    data,
  }: {
    authContext: WorkspaceAuthContext;
    recordIds: string[] | null;
    data: Record<string, unknown>;
  }): Promise<void> {
    const targetStage = data[PRECATUR_JURIDICO_DEAL_STAGE_FIELD_NAME];

    if (typeof targetStage !== 'string') {
      return;
    }

    const stageOptions = await this.getStageOptions(authContext.workspace.id);

    if (!isDefined(stageOptions)) {
      return;
    }

    if (!isDefined(recordIds)) {
      throw new CommonQueryRunnerException(
        'Stage change through Jurídico requires explicit record ids',
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`Selecione os negócios para mudar a etapa.`,
        },
      );
    }

    const workspaceId = authContext.workspace.id;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const dealRepository =
        await this.globalWorkspaceOrmManager.getRepository<PrecaturJuridicoDeal>(
          workspaceId,
          PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
          { shouldBypassPermissionChecks: true },
        );
      const analysisRepository =
        await this.globalWorkspaceOrmManager.getRepository<PrecaturJuridicoAnalysis>(
          workspaceId,
          PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
          { shouldBypassPermissionChecks: true },
        );

      const deals = await dealRepository.find({
        where: { id: In(recordIds) },
      });
      const analyses = await analysisRepository.find({
        where: { negociacaoId: In(recordIds) },
        order: { createdAt: 'DESC' },
      });

      for (const deal of deals) {
        const latestAnalysis = analyses.find(
          (analysis) => analysis.negociacaoId === deal.id,
        );

        const block = getPrecaturJuridicoGateBlock({
          stageOptions,
          currentStage: deal.status,
          targetStage,
          decision: isDefined(latestAnalysis)
            ? getPrecaturJuridicoDecision(latestAnalysis.status)
            : null,
        });

        if (block === 'REJECTED') {
          throw new CommonQueryRunnerException(
            `Deal ${deal.id} was rejected by Jurídico`,
            CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
            {
              userFriendlyMessage: msg`A Análise Jurídica foi reprovada: o negócio só pode ir para "Recusado" ou voltar de etapa.`,
            },
          );
        }

        if (block === 'WAITING_DECISION') {
          throw new CommonQueryRunnerException(
            `Deal ${deal.id} is waiting for Jurídico`,
            CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
            {
              userFriendlyMessage: msg`Aguardando decisão do jurídico: o negócio passa por "Jurídico" e só avança depois que a Análise Jurídica for aprovada.`,
            },
          );
        }
      }
    }, authContext);
  }

  // Só age em workspace com o recurso ativado (campo de decisão criado)
  private async getStageOptions(
    workspaceId: string,
  ): Promise<StageOption[] | null> {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );
    const dealObjectId = idByNameSingular[PRECATUR_JURIDICO_DEAL_OBJECT_NAME];
    const dealObject = isDefined(dealObjectId)
      ? findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: dealObjectId,
          flatEntityMaps: flatObjectMetadataMaps,
        })
      : undefined;

    if (!isDefined(dealObject)) {
      return null;
    }

    const dealFields = getFlatFieldsFromFlatObjectMetadata(
      dealObject,
      flatFieldMetadataMaps,
    );

    const hasDecisionField = dealFields.some(
      (field) => field.name === PRECATUR_JURIDICO_DEAL_DECISION_FIELD_NAME,
    );
    const stageField = dealFields.find(
      (field) => field.name === PRECATUR_JURIDICO_DEAL_STAGE_FIELD_NAME,
    );

    if (!hasDecisionField || !isDefined(stageField)) {
      return null;
    }

    return (stageField.options as StageOption[] | null) ?? [];
  }
}

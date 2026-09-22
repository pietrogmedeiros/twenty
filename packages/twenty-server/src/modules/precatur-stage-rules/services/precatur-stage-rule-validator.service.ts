import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
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
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PRECATUR_STAGE_RULE_OBJECT_NAME } from 'src/modules/precatur-stage-rules/constants/precatur-stage-rule-object-name.constant';
import { isPrecaturStageRuleFieldFilled } from 'src/modules/precatur-stage-rules/utils/is-precatur-stage-rule-field-filled.util';

type StageRuleRecord = {
  objectNameSingular: string | null;
  stageFieldName: string | null;
  stageValue: string | null;
  requiredFieldNames: unknown;
};

type RecordValues = Record<string, unknown>;

type SelectOption = { value: string; label: string; position: number };

// Compostos chegam parciais no update (ex.: só amountMicros): junta com o salvo
const mergeRecordWithUpdate = (
  record: RecordValues,
  data: RecordValues,
): RecordValues => {
  const merged: RecordValues = { ...record };

  for (const [key, value] of Object.entries(data)) {
    const currentValue = record[key];

    merged[key] =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof currentValue === 'object' &&
      currentValue !== null &&
      !Array.isArray(currentValue)
        ? { ...currentValue, ...value }
        : value;
  }

  return merged;
};

const getFieldValue = (field: FlatFieldMetadata, record: RecordValues) => {
  const isManyToOneRelation =
    (field.type === FieldMetadataType.RELATION ||
      field.type === FieldMetadataType.MORPH_RELATION) &&
    (field.settings as { relationType?: RelationType } | null)?.relationType ===
      RelationType.MANY_TO_ONE;

  return isManyToOneRelation ? record[`${field.name}Id`] : record[field.name];
};

// Precatur: impede avançar de etapa sem os campos obrigatórios configurados
// na tela Configurações → Regras de etapa (registros do objeto regraEtapa)
@Injectable()
export class PrecaturStageRuleValidatorService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async validateStageChange({
    authContext,
    objectName,
    recordIds,
    data,
  }: {
    authContext: WorkspaceAuthContext;
    objectName: string;
    recordIds: string[] | null;
    data: RecordValues;
  }): Promise<void> {
    if (objectName === PRECATUR_STAGE_RULE_OBJECT_NAME) {
      return;
    }

    const workspaceId = authContext.workspace.id;

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

    // Workspace sem o objeto de regras: recurso não ativado, nada a validar
    if (!isDefined(idByNameSingular[PRECATUR_STAGE_RULE_OBJECT_NAME])) {
      return;
    }

    const objectId = idByNameSingular[objectName];
    const objectMetadata = isDefined(objectId)
      ? findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: objectId,
          flatEntityMaps: flatObjectMetadataMaps,
        })
      : undefined;

    if (!isDefined(objectMetadata)) {
      return;
    }

    const objectFields = getFlatFieldsFromFlatObjectMetadata(
      objectMetadata,
      flatFieldMetadataMaps,
    );

    const changedStageFields = objectFields.filter(
      (field) =>
        field.type === FieldMetadataType.SELECT &&
        Object.prototype.hasOwnProperty.call(data, field.name) &&
        isDefined(data[field.name]),
    );

    if (changedStageFields.length === 0) {
      return;
    }

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const ruleRepository =
        await this.globalWorkspaceOrmManager.getRepository<StageRuleRecord>(
          workspaceId,
          PRECATUR_STAGE_RULE_OBJECT_NAME,
          { shouldBypassPermissionChecks: true },
        );

      const rules = await ruleRepository.find({
        where: {
          objectNameSingular: objectName,
          stageFieldName: In(changedStageFields.map((field) => field.name)),
        },
      });

      if (rules.length === 0) {
        return;
      }

      if (!isDefined(recordIds)) {
        throw new CommonQueryRunnerException(
          'Stage change with rules requires explicit record ids',
          CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
          {
            userFriendlyMessage: msg`Esta etapa tem campos obrigatórios. Selecione os registros para mudar a etapa.`,
          },
        );
      }

      const recordRepository =
        await this.globalWorkspaceOrmManager.getRepository<RecordValues>(
          workspaceId,
          objectName,
          { shouldBypassPermissionChecks: true },
        );

      const records = await recordRepository.find({
        where: { id: In(recordIds) },
      });

      for (const stageField of changedStageFields) {
        this.assertRequiredFieldsForStageField({
          stageField,
          rules: rules.filter(
            (rule) => rule.stageFieldName === stageField.name,
          ),
          records,
          data,
          objectFields,
        });
      }
    }, authContext);
  }

  private assertRequiredFieldsForStageField({
    stageField,
    rules,
    records,
    data,
    objectFields,
  }: {
    stageField: FlatFieldMetadata;
    rules: StageRuleRecord[];
    records: RecordValues[];
    data: RecordValues;
    objectFields: FlatFieldMetadata[];
  }) {
    if (rules.length === 0) {
      return;
    }

    const options = [
      ...((stageField.options as SelectOption[] | null) ?? []),
    ].sort((optionA, optionB) => optionA.position - optionB.position);

    const targetValue = data[stageField.name];
    const targetOption = options.find((option) => option.value === targetValue);

    if (!isDefined(targetOption)) {
      return;
    }

    const requiredFieldNamesByStage = new Map<string, string[]>(
      rules.map((rule) => [
        rule.stageValue ?? '',
        Array.isArray(rule.requiredFieldNames)
          ? rule.requiredFieldNames.filter(
              (fieldName): fieldName is string => typeof fieldName === 'string',
            )
          : [],
      ]),
    );

    const missingFieldLabels = new Set<string>();

    for (const record of records) {
      const currentOption = options.find(
        (option) => option.value === record[stageField.name],
      );
      const currentPosition = currentOption?.position ?? -Infinity;

      // Voltar ou manter a etapa é sempre permitido
      if (targetOption.position <= currentPosition) {
        continue;
      }

      // Pular etapas não dribla a regra: acumula as etapas atravessadas
      const requiredFieldNames = new Set(
        options
          .filter(
            (option) =>
              option.position > currentPosition &&
              option.position <= targetOption.position,
          )
          .flatMap(
            (option) => requiredFieldNamesByStage.get(option.value) ?? [],
          ),
      );

      const recordAfterUpdate = mergeRecordWithUpdate(record, data);

      for (const fieldName of requiredFieldNames) {
        const field = objectFields.find(
          (objectField) => objectField.name === fieldName,
        );

        if (
          isDefined(field) &&
          !isPrecaturStageRuleFieldFilled(
            field.type,
            getFieldValue(field, recordAfterUpdate),
          )
        ) {
          missingFieldLabels.add(field.label);
        }
      }
    }

    if (missingFieldLabels.size === 0) {
      return;
    }

    const stageLabel = targetOption.label;
    const fieldLabels = [...missingFieldLabels].join(', ');

    throw new CommonQueryRunnerException(
      `Missing required fields for stage ${targetOption.value}: ${fieldLabels}`,
      CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
      {
        userFriendlyMessage: msg`Para mover para "${stageLabel}", preencha: ${fieldLabels}.`,
      },
    );
  }
}

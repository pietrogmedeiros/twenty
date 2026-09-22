import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { PrecaturStageRuleStageCard } from '@/precatur-stage-rules/components/PrecaturStageRuleStageCard';
import { PRECATUR_STAGE_RULE_OBJECT_NAME } from '@/precatur-stage-rules/constants/PrecaturStageRuleObjectName';
import { useIsPrecaturStageRulesEnabled } from '@/precatur-stage-rules/hooks/useIsPrecaturStageRulesEnabled';
import { usePrecaturStageRules } from '@/precatur-stage-rules/hooks/usePrecaturStageRules';
import { getPrecaturStageRuleCandidateFields } from '@/precatur-stage-rules/utils/getPrecaturStageRuleCandidateFields';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { Select } from '@/ui/input/components/Select';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { FieldMetadataType } from '~/generated-metadata/graphql';

// Objetos técnicos do próprio CRM que não são pipelines
const NON_PIPELINE_OBJECT_NAMES = new Set([
  PRECATUR_STAGE_RULE_OBJECT_NAME,
  'mensagemChat',
  'leituraChat',
]);

// Nomes usuais do campo de etapa, para já abrir no campo certo
const PREFERRED_STAGE_FIELD_NAMES = ['status', 'stage', 'faseGeral', 'etapa'];

const StyledSelectors = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: 1fr 1fr;
`;

const StyledStages = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledNotice = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
`;

export const SettingsPrecaturStageRules = () => {
  const isEnabled = useIsPrecaturStageRulesEnabled();

  return (
    <SettingsPageLayout
      title="Regras de etapa"
      links={[
        {
          children: 'Workspace',
          href: getSettingsPath(SettingsPath.General),
        },
        { children: 'Regras de etapa' },
      ]}
    >
      <SettingsPageContainer>
        {isEnabled ? (
          <SettingsPrecaturStageRulesContent />
        ) : (
          <StyledNotice>
            As regras de etapa ainda não foram ativadas neste workspace.
          </StyledNotice>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};

const SettingsPrecaturStageRulesContent = () => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { enqueueErrorSnackBar } = useSnackBar();

  const pipelineObjects = objectMetadataItems
    .filter(
      (objectMetadataItem) =>
        objectMetadataItem.isActive &&
        !objectMetadataItem.isSystem &&
        !NON_PIPELINE_OBJECT_NAMES.has(objectMetadataItem.nameSingular) &&
        objectMetadataItem.fields.some(
          (field) => field.type === FieldMetadataType.SELECT && field.isActive,
        ),
    )
    .sort((objectA, objectB) =>
      objectA.labelPlural.localeCompare(objectB.labelPlural, 'pt-BR'),
    );

  const [selectedObjectName, setSelectedObjectName] = useState(
    pipelineObjects.find((item) => item.nameSingular === 'negociacao')
      ?.nameSingular ??
      pipelineObjects[0]?.nameSingular ??
      '',
  );
  const selectedObject = pipelineObjects.find(
    (item) => item.nameSingular === selectedObjectName,
  );

  const stageFields = (selectedObject?.fields ?? []).filter(
    (field) => field.type === FieldMetadataType.SELECT && field.isActive,
  );
  const defaultStageFieldName =
    PREFERRED_STAGE_FIELD_NAMES.find((name) =>
      stageFields.some((field) => field.name === name),
    ) ??
    stageFields[0]?.name ??
    '';

  const [chosenStageFieldName, setChosenStageFieldName] = useState<
    string | null
  >(null);
  const stageFieldName =
    isDefined(chosenStageFieldName) &&
    stageFields.some((field) => field.name === chosenStageFieldName)
      ? chosenStageFieldName
      : defaultStageFieldName;
  const stageField = stageFields.find((field) => field.name === stageFieldName);

  const { ruleByStageValue, saveStageRule } = usePrecaturStageRules({
    objectNameSingular: selectedObjectName,
    stageFieldName,
  });

  const candidateFields = getPrecaturStageRuleCandidateFields(
    selectedObject?.fields ?? [],
    stageFieldName,
  );

  const stageOptions = [...(stageField?.options ?? [])].sort(
    (optionA, optionB) => optionA.position - optionB.position,
  );

  const handleStageRuleChange = async (
    stageValue: string,
    stageLabel: string,
    requiredFieldNames: string[],
  ) => {
    try {
      await saveStageRule({
        stageValue,
        ruleName: `${selectedObject?.labelSingular ?? selectedObjectName} › ${stageField?.label ?? stageFieldName} › ${stageLabel}`,
        requiredFieldNames,
      });
    } catch {
      enqueueErrorSnackBar({ message: 'Não foi possível salvar a regra' });
    }
  };

  if (pipelineObjects.length === 0) {
    return (
      <StyledNotice>Nenhum objeto com campo de etapa (seleção).</StyledNotice>
    );
  }

  return (
    <>
      <Section>
        <H2Title
          title="Pipeline"
          description="Escolha o objeto e o campo que representa a etapa (ex.: Status)."
        />
        <StyledSelectors>
          <Select
            dropdownId="precatur-stage-rules-object"
            label="Objeto"
            fullWidth
            withSearchInput
            value={selectedObjectName}
            options={pipelineObjects.map((item) => ({
              value: item.nameSingular,
              label: item.labelPlural,
            }))}
            onChange={(value) => {
              setSelectedObjectName(value);
              setChosenStageFieldName(null);
            }}
          />
          <Select
            dropdownId="precatur-stage-rules-stage-field"
            label="Campo de etapa"
            fullWidth
            value={stageFieldName}
            options={stageFields.map((field) => ({
              value: field.name,
              label: field.label,
            }))}
            onChange={setChosenStageFieldName}
          />
        </StyledSelectors>
      </Section>
      <Section>
        <H2Title
          title="Campos obrigatórios por etapa"
          description="Para avançar para uma etapa, os campos marcados nela precisam estar preenchidos. Pular etapas soma as regras das etapas puladas; voltar de etapa é sempre permitido. Caixas de seleção contam como preenchidas só quando marcadas."
        />
        <StyledStages>
          {stageOptions.map((stageOption) => (
            <PrecaturStageRuleStageCard
              key={`${selectedObjectName}-${stageFieldName}-${stageOption.value}`}
              stageOption={stageOption}
              candidateFields={candidateFields}
              requiredFieldNames={
                ruleByStageValue.get(stageOption.value)?.requiredFieldNames ??
                []
              }
              onChange={(requiredFieldNames) =>
                handleStageRuleChange(
                  stageOption.value,
                  stageOption.label,
                  requiredFieldNames,
                )
              }
            />
          ))}
        </StyledStages>
      </Section>
    </>
  );
};

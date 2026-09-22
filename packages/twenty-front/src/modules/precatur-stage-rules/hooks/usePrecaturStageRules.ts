import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { PRECATUR_STAGE_RULE_OBJECT_NAME } from '@/precatur-stage-rules/constants/PrecaturStageRuleObjectName';
import { PRECATUR_STAGE_RULE_RECORD_GQL_FIELDS } from '@/precatur-stage-rules/constants/PrecaturStageRuleRecordGqlFields';
import { type PrecaturStageRule } from '@/precatur-stage-rules/types/PrecaturStageRule';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const usePrecaturStageRules = ({
  objectNameSingular,
  stageFieldName,
}: {
  objectNameSingular: string;
  stageFieldName: string;
}) => {
  const filter = useMemo(
    () => ({
      objectNameSingular: { eq: objectNameSingular },
      stageFieldName: { eq: stageFieldName },
    }),
    [objectNameSingular, stageFieldName],
  );

  const { records, loading } = useFindManyRecords<PrecaturStageRule>({
    objectNameSingular: PRECATUR_STAGE_RULE_OBJECT_NAME,
    filter,
    recordGqlFields: PRECATUR_STAGE_RULE_RECORD_GQL_FIELDS,
    skip: objectNameSingular === '' || stageFieldName === '',
  });

  const { createOneRecord } = useCreateOneRecord<PrecaturStageRule>({
    objectNameSingular: PRECATUR_STAGE_RULE_OBJECT_NAME,
    recordGqlFields: PRECATUR_STAGE_RULE_RECORD_GQL_FIELDS,
    shouldMatchRootQueryFilter: true,
  });
  const { updateOneRecord } = useUpdateOneRecord();

  const ruleByStageValue = useMemo(
    () =>
      new Map(
        records
          .filter((rule) => isDefined(rule.stageValue))
          .map((rule) => [rule.stageValue as string, rule]),
      ),
    [records],
  );

  const saveStageRule = async ({
    stageValue,
    ruleName,
    requiredFieldNames,
  }: {
    stageValue: string;
    ruleName: string;
    requiredFieldNames: string[];
  }) => {
    const existingRule = ruleByStageValue.get(stageValue);

    if (isDefined(existingRule)) {
      await updateOneRecord({
        objectNameSingular: PRECATUR_STAGE_RULE_OBJECT_NAME,
        idToUpdate: existingRule.id,
        updateOneRecordInput: { requiredFieldNames },
      });
      return;
    }

    await createOneRecord({
      name: ruleName,
      objectNameSingular,
      stageFieldName,
      stageValue,
      requiredFieldNames,
    });
  };

  return { ruleByStageValue, saveStageRule, loading };
};

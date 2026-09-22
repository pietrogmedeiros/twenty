import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { PRECATUR_STAGE_RULE_OBJECT_NAME } from '@/precatur-stage-rules/constants/PrecaturStageRuleObjectName';

// Só existe nos workspaces onde o criar-regras-etapa.mjs rodou
export const useIsPrecaturStageRulesEnabled = () => {
  const { objectMetadataItems } = useObjectMetadataItems();

  return objectMetadataItems.some(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === PRECATUR_STAGE_RULE_OBJECT_NAME &&
      objectMetadataItem.isActive,
  );
};

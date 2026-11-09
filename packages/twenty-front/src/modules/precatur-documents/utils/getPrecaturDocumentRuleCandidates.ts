import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { PRECATUR_DOCUMENT_FOLDER } from '@/precatur-documents/constants/PrecaturDocumentFolder';
import { type PrecaturStageRuleCandidate } from '@/precatur-stage-rules/types/PrecaturStageRuleCandidate';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

// Documentos que a etapa pode exigir: um por tipo de documento, mais a regra
// condicional "espelho fiscal se houver certidão positiva" quando o objeto
// tem campos de certidão
export const getPrecaturDocumentRuleCandidates = (
  objectMetadataItems: EnrichedObjectMetadataItem[],
  selectedObject: EnrichedObjectMetadataItem | undefined,
): PrecaturStageRuleCandidate[] => {
  if (!isDefined(selectedObject)) {
    return [];
  }

  const documentTypeField = objectMetadataItems
    .find((item) => item.nameSingular === CoreObjectNameSingular.Attachment)
    ?.fields.find(
      (field) =>
        field.name === PRECATUR_DOCUMENT_FOLDER.documentTypeFieldName &&
        field.isActive,
    );

  const hasFolder =
    selectedObject.nameSingular === PRECATUR_DOCUMENT_FOLDER.folderObjectName ||
    selectedObject.fields.some(
      (field) =>
        field.name === PRECATUR_DOCUMENT_FOLDER.folderRelationFieldName,
    );

  if (!isDefined(documentTypeField) || !hasFolder) {
    return [];
  }

  const typeCandidates = [...(documentTypeField.options ?? [])]
    .sort((optionA, optionB) => optionA.position - optionB.position)
    .map((option) => ({
      id: `${PRECATUR_DOCUMENT_FOLDER.ruleItemPrefix}${option.value}`,
      name: `${PRECATUR_DOCUMENT_FOLDER.ruleItemPrefix}${option.value}`,
      label: `Documento: ${option.label}`,
    }));

  const hasCertificateFields = selectedObject.fields.some((field) =>
    field.name.startsWith('situacaoCertidao'),
  );

  return hasCertificateFields
    ? [
        ...typeCandidates,
        {
          id: `${PRECATUR_DOCUMENT_FOLDER.ruleItemPrefix}${PRECATUR_DOCUMENT_FOLDER.fiscalMirrorIfPositiveRuleKey}`,
          name: `${PRECATUR_DOCUMENT_FOLDER.ruleItemPrefix}${PRECATUR_DOCUMENT_FOLDER.fiscalMirrorIfPositiveRuleKey}`,
          label: 'Documento: Espelho fiscal (se houver certidão positiva)',
        },
      ]
    : typeCandidates;
};

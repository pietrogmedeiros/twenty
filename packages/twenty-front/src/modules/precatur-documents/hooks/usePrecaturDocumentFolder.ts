import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { PRECATUR_DOCUMENT_FOLDER } from '@/precatur-documents/constants/PrecaturDocumentFolder';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { capitalize, isDefined } from 'twenty-shared/utils';

export type PrecaturDocumentFolder = {
  // Onde o upload grava
  uploadTarget: ActivityTargetableObject;
  // De onde a aba lê (pasta do precatório + anexos antigos do próprio card)
  displayTargets: ActivityTargetableObject[];
  // null = workspace sem tipo de documento (aba Arquivos padrão)
  documentTypeOptions: FieldMetadataItemOption[] | null;
};

const getRelatedId = (record: Record<string, unknown> | null | undefined) => {
  if (!isDefined(record)) {
    return null;
  }

  const foreignKey =
    record[`${PRECATUR_DOCUMENT_FOLDER.folderRelationFieldName}Id`];

  if (typeof foreignKey === 'string') {
    return foreignKey;
  }

  const relatedRecord = record[
    PRECATUR_DOCUMENT_FOLDER.folderRelationFieldName
  ] as { id?: unknown } | null | undefined;

  return typeof relatedRecord?.id === 'string' ? relatedRecord.id : null;
};

export const usePrecaturDocumentFolder = (
  targetRecord: ActivityTargetableObject,
): PrecaturDocumentFolder => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const record = useAtomFamilyStateValue(
    recordStoreFamilyState,
    targetRecord.id,
  ) as Record<string, unknown> | null | undefined;

  const attachmentMetadata = objectMetadataItems.find(
    (item) => item.nameSingular === CoreObjectNameSingular.Attachment,
  );
  const documentTypeField = attachmentMetadata?.fields.find(
    (field) =>
      field.name === PRECATUR_DOCUMENT_FOLDER.documentTypeFieldName &&
      field.isActive,
  );
  const hasFolderTarget =
    attachmentMetadata?.fields.some(
      (field) =>
        field.name ===
        `target${capitalize(PRECATUR_DOCUMENT_FOLDER.folderObjectName)}`,
    ) ?? false;

  const documentTypeOptions = isDefined(documentTypeField)
    ? [
        ...((documentTypeField.options ?? []) as FieldMetadataItemOption[]),
      ].sort((optionA, optionB) => optionA.position - optionB.position)
    : null;

  const folderId =
    targetRecord.targetObjectNameSingular ===
    PRECATUR_DOCUMENT_FOLDER.folderObjectName
      ? null
      : getRelatedId(record);

  if (!hasFolderTarget || !isDefined(folderId)) {
    return {
      uploadTarget: targetRecord,
      displayTargets: [targetRecord],
      documentTypeOptions,
    };
  }

  const folderTarget = {
    id: folderId,
    targetObjectNameSingular: PRECATUR_DOCUMENT_FOLDER.folderObjectName,
  };

  return {
    uploadTarget: folderTarget,
    displayTargets: [folderTarget, targetRecord],
    documentTypeOptions,
  };
};

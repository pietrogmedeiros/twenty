import {
  PRECATUR_CERTIFICATE_FIELD_PREFIX,
  PRECATUR_DOCUMENT_RULE_PREFIX,
  PRECATUR_FISCAL_MIRROR_DOCUMENT_TYPE,
  PRECATUR_FISCAL_MIRROR_IF_POSITIVE_RULE_KEY,
  PRECATUR_POSITIVE_CERTIFICATE_VALUE,
} from 'src/modules/precatur-documents/constants/precatur-documents.constants';

export const isPrecaturDocumentRuleItem = (ruleItem: string) =>
  ruleItem.startsWith(PRECATUR_DOCUMENT_RULE_PREFIX);

const hasPositiveCertificate = (record: Record<string, unknown>) =>
  Object.entries(record).some(
    ([fieldName, value]) =>
      fieldName.startsWith(PRECATUR_CERTIFICATE_FIELD_PREFIX) &&
      value === PRECATUR_POSITIVE_CERTIFICATE_VALUE,
  );

// Devolve os rótulos dos documentos exigidos que ainda não estão na pasta
export const getPrecaturMissingDocuments = ({
  ruleItems,
  record,
  presentDocumentTypes,
  documentTypeLabelByValue,
}: {
  ruleItems: string[];
  record: Record<string, unknown>;
  presentDocumentTypes: Set<string>;
  documentTypeLabelByValue: Map<string, string>;
}): string[] => {
  const missing = new Set<string>();

  for (const ruleItem of ruleItems.filter(isPrecaturDocumentRuleItem)) {
    const key = ruleItem.slice(PRECATUR_DOCUMENT_RULE_PREFIX.length);

    if (key === PRECATUR_FISCAL_MIRROR_IF_POSITIVE_RULE_KEY) {
      if (
        hasPositiveCertificate(record) &&
        !presentDocumentTypes.has(PRECATUR_FISCAL_MIRROR_DOCUMENT_TYPE)
      ) {
        missing.add(
          `${documentTypeLabelByValue.get(PRECATUR_FISCAL_MIRROR_DOCUMENT_TYPE) ?? 'Espelho fiscal'} (há certidão positiva)`,
        );
      }
      continue;
    }

    if (!presentDocumentTypes.has(key)) {
      missing.add(documentTypeLabelByValue.get(key) ?? key);
    }
  }

  return [...missing];
};

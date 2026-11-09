// Precatur: a pasta do processo é o conjunto de anexos do Precatório; cards
// ligados a ele (campo "precatorio") mostram e gravam lá
export const PRECATUR_DOCUMENT_FOLDER = {
  folderObjectName: 'precatorio',
  folderRelationFieldName: 'precatorio',
  // Campo SELECT custom no objeto attachment (criar-pasta-documentos.mjs)
  documentTypeFieldName: 'tipoDocumento',
  // Item de regra de etapa que exige documento: "documento:<tipo>"
  ruleItemPrefix: 'documento:',
  fiscalMirrorIfPositiveRuleKey: 'ESPELHO_FISCAL_SE_CERTIDAO_POSITIVA',
} as const;

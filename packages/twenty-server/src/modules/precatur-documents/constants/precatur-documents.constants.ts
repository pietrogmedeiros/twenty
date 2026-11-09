// Precatur: a "pasta do processo" é o conjunto de anexos do Precatório.
// Cards ligados a ele (Negociação, Análise, Pós-Compra...) mostram e gravam lá.
export const PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME = 'precatorio';

export const PRECATUR_DOCUMENT_FOLDER_RELATION_FIELD_NAME = 'precatorio';

// Campo custom no objeto attachment (SELECT) criado por criar-pasta-documentos.mjs
export const PRECATUR_DOCUMENT_TYPE_FIELD_NAME = 'tipoDocumento';

// Itens de regra de etapa que exigem documento em vez de campo:
// "documento:<VALOR do tipoDocumento>"
export const PRECATUR_DOCUMENT_RULE_PREFIX = 'documento:';

export const PRECATUR_FISCAL_MIRROR_DOCUMENT_TYPE = 'ESPELHO_FISCAL';

// Regra condicional pedida pelo jurídico: certidão positiva exige espelho fiscal
export const PRECATUR_FISCAL_MIRROR_IF_POSITIVE_RULE_KEY =
  'ESPELHO_FISCAL_SE_CERTIDAO_POSITIVA';

export const PRECATUR_CERTIFICATE_FIELD_PREFIX = 'situacaoCertidao';

export const PRECATUR_POSITIVE_CERTIFICATE_VALUE = 'POSITIVA';

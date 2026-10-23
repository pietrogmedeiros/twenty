// Funil comercial: ao entrar na etapa "Jurídico" o negócio é espelhado para
// a Análise Jurídica e só avança depois da decisão do jurídico.
export const PRECATUR_JURIDICO_DEAL_OBJECT_NAME = 'negociacao';
export const PRECATUR_JURIDICO_DEAL_STAGE_FIELD_NAME = 'status';
export const PRECATUR_JURIDICO_DEAL_STAGE_VALUE = 'JURIDICO';
export const PRECATUR_JURIDICO_DEAL_REJECTED_STAGE_VALUE = 'RECUSADO';

export const PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME = 'analiseJuridica';

export const PRECATUR_JURIDICO_ANALYSIS_STATUS = {
  PENDING: 'PENDENTE',
  APPROVED: 'APROVADO',
  APPROVED_WITH_CAVEATS: 'COM_RESSALVAS',
  REJECTED: 'REPROVADO',
} as const;

// Campos criados por precatur-build/criar-espelho-juridico.mjs
export const PRECATUR_JURIDICO_DEAL_DECISION_FIELD_NAME = 'decisaoJuridica';
export const PRECATUR_JURIDICO_ANALYSIS_DEAL_FIELD_NAME = 'negociacao';

export const PRECATUR_JURIDICO_DECISION = {
  WAITING: 'AGUARDANDO',
  APPROVED: 'APROVADO',
  APPROVED_WITH_CAVEATS: 'COM_RESSALVAS',
  REJECTED: 'REPROVADO',
} as const;

export type PrecaturJuridicoDecision =
  (typeof PRECATUR_JURIDICO_DECISION)[keyof typeof PRECATUR_JURIDICO_DECISION];

// Pagamento ao cedente pago abre o Acompanhamento Pós-Compra (o trabalho
// jurídico segue até a Precatur receber ou ceder o crédito adiante).
export const PRECATUR_JURIDICO_PAYMENT_OBJECT_NAME = 'pagamento';
export const PRECATUR_JURIDICO_PAYMENT_TO_ASSIGNOR_TYPE =
  'PAGAMENTO_AO_CEDENTE';
export const PRECATUR_JURIDICO_PAYMENT_PAID_STATUSES = ['PAGO', 'CONCILIADO'];

export const PRECATUR_JURIDICO_POST_PURCHASE_OBJECT_NAME =
  'acompanhamentoPosCompra';
export const PRECATUR_JURIDICO_POST_PURCHASE_FIRST_STAGE = 'PETICIONAR_CESSAO';

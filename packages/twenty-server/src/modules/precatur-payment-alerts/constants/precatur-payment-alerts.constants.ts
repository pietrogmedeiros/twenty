// Precatur: alertas antes do pagamento do precatório, no Pós-Compra em
// "Aguardando pagamento" (pedido do jurídico: 6, 3 e 1 mês antes)
export const PRECATUR_PAYMENT_ALERT_OBJECT_NAME = 'acompanhamentoPosCompra';
export const PRECATUR_PAYMENT_ALERT_STAGE_FIELD_NAME = 'etapa';
export const PRECATUR_PAYMENT_ALERT_STAGE_VALUE = 'AGUARDANDO_PAGAMENTO';

// Campos criados por precatur-build/criar-pos-compra-v2.mjs
export const PRECATUR_PAYMENT_ALERT_FIELDS = {
  expectedPaymentDate: 'previsaoPagamento',
  sentAlerts: 'alertasPagamentoEnviados',
  assignee: 'responsavelJuridico',
} as const;

// Valor do MULTI_SELECT alertasPagamentoEnviados → meses antes do pagamento
export const PRECATUR_PAYMENT_ALERT_MILESTONES = [
  { value: 'SEIS_MESES', months: 6, label: '6 meses' },
  { value: 'TRES_MESES', months: 3, label: '3 meses' },
  { value: 'UM_MES', months: 1, label: '1 mês' },
] as const;

export const PRECATUR_PAYMENT_ALERT_ACTIVITY_TYPE = 'AUDIENCIA_PRAZO';

// Todo dia às 11h UTC (8h em Brasília)
export const PRECATUR_PAYMENT_ALERT_CRON_PATTERN = '0 11 * * *';

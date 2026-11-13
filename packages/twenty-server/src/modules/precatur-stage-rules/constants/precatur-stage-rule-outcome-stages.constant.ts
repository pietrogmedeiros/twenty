// Etapas de desfecho (decisão final, não um passo do processo). Ir para elas
// não exige os campos das etapas puladas: um lead pode ser perdido logo no
// início e o jurídico aprova/reprova na Pré Análise, antes da Due. Sair delas
// para uma etapa do processo (reabrir, ex.: Aprovado → Due depois do aceite)
// exige os campos da etapa de destino, mesmo sendo "voltar" na ordem.
export const PRECATUR_STAGE_RULE_OUTCOME_STAGES: readonly string[] = [
  'APROVADO',
  'COM_RESSALVAS',
  'REPROVADO',
  'PERDIDO',
];

// Cobrança diária de documentos (jurídico, nov/2026): começa quando a Análise
// Jurídica entra na Pré Análise e, enquanto faltar documento exigido para a
// Due, cobra o responsável comercial no bate-papo do negócio por 5 dias úteis;
// depois o gestor comercial é avisado uma vez e a cobrança encerra. Continua
// mesmo se a análise sair da Pré Análise (a Due só vem depois do aceite, e o
// comercial já junta os documentos enquanto negocia); só para se reprovar.
// Campos criados por precatur-build/criar-direito-creditorio.mjs
export const PRECATUR_DOCUMENT_REMINDER = {
  analysisObjectName: 'analiseJuridica',
  stageFieldName: 'status',
  startStage: 'PRE_ANALISE_AUTOMATICA',
  stopStages: ['REPROVADO'] as readonly string[],
  // Etapa cuja regra define os documentos cobrados
  ruleStage: 'DUE',
  fallbackRuleItems: [
    'documento:PROCESSO_PRECATORIO',
    'documento:DOCUMENTO_PESSOAL',
  ],
  maxReminders: 5,
  // Gestor comercial avisado no fim (Configurações → Regras de etapa)
  settingsObjectName: 'configuracaoPrecatur',
  managerSettingKey: 'COBRANCA_DOCUMENTOS_GESTOR',
  fields: {
    status: 'cobrancaDocumentos',
    sentCount: 'cobrancaDocumentosEnviadas',
    lastSentOn: 'cobrancaDocumentosUltimaEm',
  },
  status: {
    active: 'COBRANDO',
    resolved: 'RESOLVIDA',
    escalated: 'ESCALADA',
    closed: 'ENCERRADA',
  },
  // 9h de Brasília, segunda a sexta (feriados não são considerados)
  cronPattern: '0 12 * * 1-5',
} as const;

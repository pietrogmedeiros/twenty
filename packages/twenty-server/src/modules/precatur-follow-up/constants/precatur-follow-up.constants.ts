// Funil onde o follow-up roda e a etapa que dispara a sequência.
export const PRECATUR_FOLLOW_UP_OBJECT_NAME = 'negociacao';
export const PRECATUR_FOLLOW_UP_STAGE_FIELD_NAME = 'status';
export const PRECATUR_FOLLOW_UP_STAGE_VALUE = 'EM_NEGOCIACAO';

// Dias corridos, contados da entrada na etapa, de cada follow-up (1, 3 e 7).
// Depois do último, espera mais PRECATUR_FOLLOW_UP_CALL_TASK_AFTER_DAYS sem
// resposta e cria a tarefa de ligar para o responsável.
export const PRECATUR_FOLLOW_UP_DAYS = [1, 3, 7];
export const PRECATUR_FOLLOW_UP_CALL_TASK_AFTER_DAYS = 2;

export const PRECATUR_FOLLOW_UP_CRON_PATTERN = '*/15 * * * *';

// Campos criados em negociacao por precatur-build/criar-follow-up.mjs
export const PRECATUR_FOLLOW_UP_FIELDS = {
  status: 'followUpStatus',
  sentCount: 'followUpEnviados',
  nextAt: 'followUpProximoEm',
  enteredStageAt: 'followUpIniciadoEm',
} as const;

export const PRECATUR_FOLLOW_UP_STATUS = {
  ACTIVE: 'ATIVO',
  PAUSED: 'PAUSADO',
  REPLIED: 'RESPONDEU',
  FINISHED: 'CONCLUIDO',
  LEFT_STAGE: 'SAIU_DA_ETAPA',
  NO_PHONE: 'SEM_TELEFONE',
} as const;

// Campos da Agenda (precatur-build/criar-agenda.mjs) usados nas tarefas
export const PRECATUR_FOLLOW_UP_TASK_ACTIVITY_TYPE = 'FOLLOW_UP';
export const PRECATUR_FOLLOW_UP_CALL_ACTIVITY_TYPE = 'LIGACAO';

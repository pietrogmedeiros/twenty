// Campos explícitos: o default (profundidade 1) puxaria todas as relações
// automáticas do objeto custom (anexos, timeline, favoritos...) a cada mensagem.
export const PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS = {
  id: true,
  name: true,
  body: true,
  targetObjectNameSingular: true,
  targetRecordId: true,
  targetRecordLabel: true,
  mentionedWorkspaceMemberIds: true,
  attachmentIds: true,
  createdAt: true,
  createdBy: true,
};

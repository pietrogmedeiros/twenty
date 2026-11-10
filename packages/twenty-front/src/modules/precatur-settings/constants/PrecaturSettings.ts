// Objeto custom criado por precatur-build/criar-direito-creditorio.mjs: uma
// linha por configuração (chave + valor JSON), lida também pelo servidor
export const PRECATUR_SETTINGS = {
  objectName: 'configuracaoPrecatur',
  documentReminderManagerKey: 'COBRANCA_DOCUMENTOS_GESTOR',
  recordGqlFields: { id: true, name: true, chave: true, valor: true },
} as const;

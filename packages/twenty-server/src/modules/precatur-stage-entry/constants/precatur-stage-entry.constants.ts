// Funis com "Entrou na etapa em": objeto → campo de etapa (SELECT). O campo
// de data é criado por precatur-build/criar-juridico.mjs; workspace sem ele
// é ignorado (ex.: Filial Salvador antes de rodar o script).
export const PRECATUR_STAGE_ENTRY_STAGE_FIELD_BY_OBJECT: Record<
  string,
  string
> = {
  negociacao: 'status',
  analiseJuridica: 'status',
  acompanhamentoPosCompra: 'etapa',
  oportunidadeSalvador: 'etapa',
};

export const PRECATUR_STAGE_ENTRY_DATE_FIELD_NAME = 'entrouNaEtapaEm';

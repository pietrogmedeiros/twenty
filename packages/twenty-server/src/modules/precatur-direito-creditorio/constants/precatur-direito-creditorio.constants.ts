// Objeto e campos criados por precatur-build/criar-direito-creditorio.mjs
export const PRECATUR_DIREITO_CREDITORIO = {
  objectName: 'direitoCreditorio',
  stageFieldName: 'etapa',
  firstStage: 'AGUARDANDO_EXPEDICAO_OFICIO',
  // Etapa final: volta para o comercial fazer a proposta
  becamePrecatorioStage: 'VIROU_PRECATORIO',
  // Etapa da Análise Jurídica que abre o card
  analysisStage: 'DIREITO_CREDITORIO',
  updatedValueFieldName: 'valorAtualizado',
  precatorioUpdatedValueFieldName: 'valorAtualizado',
  dealResponsibleFieldName: 'responsavelComercial',
  analysisResponsibleFieldName: 'advogadoResponsavel',
} as const;

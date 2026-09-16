// Cria os campos novos dos 4 pipelines (lista do cliente, 2026-09-15) via API de metadados.
// Uso: TWENTY_API_KEY=<jwt> node criar-campos-pipelines.mjs [http://localhost:3000]
// Idempotente: consulta campos existentes e pula os que já existem no objeto.
// Campos pulados por já existirem (equivale ao mesmo conceito, criados em 24/07):
//   Negociação:     Origem do Lead→canalOrigem | CNPJ/CPF e CPF→cpfCnpjCedente
//   Análise Jurídica: Parecer Jurídico→parecerJuridico
//   Pagamento:      Comprovante de Pagamento→comprovante
// Anexos/documentos são TEXT (padrão do projeto: arquivo físico vai na aba Attachments).
// Campos marcados ⚠️ na lista do cliente usaram interpretação registrada em "notas".

const ENDPOINT = `${process.argv[2] ?? 'http://localhost:3000'}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;

const ANEXO = 'Documento/anexo — subir o arquivo na aba Attachments do registro e colar o link aqui.';

// [objeto, name, label, type, extra?]
const SPEC = [
  // ─── NEGOCIAÇÃO (Comercial) ──────────────────────────────────────────────
  ['negociacao', 'resposta', '3. "Resposta"', 'TEXT', { description: '⚠️ campo do formulário original; ajustar se necessário.' }],
  ['negociacao', 'aceite', 'Aceite (Sim ou Não)', 'BOOLEAN'],
  ['negociacao', 'cessionario', 'Cessionário', 'TEXT'],
  ['negociacao', 'certidaoCasamentoNascimento', 'Certidão de Casamento / Nascimento', 'TEXT', { description: ANEXO }],
  ['negociacao', 'comprovanteResidencia', 'Comprovante de Residência', 'TEXT', { description: ANEXO }],
  ['negociacao', 'confirmacaoDiretorComercial', 'Confirmação - Diretor Comercial', 'BOOLEAN'],
  ['negociacao', 'consideracoes', 'Considerações', 'RICH_TEXT'],
  ['negociacao', 'contraProposta', 'Contra Proposta ( Se houver )', 'CURRENCY'],
  ['negociacao', 'dadosBancarios', 'Dados Bancários', 'TEXT'],
  ['negociacao', 'enteDevedor', 'Ente Devedor', 'TEXT'],
  ['negociacao', 'identidadeCnh', 'Identidade / CNH', 'TEXT', { description: ANEXO }],
  ['negociacao', 'informativoCessao', 'Informativo Cessão', 'TEXT', { description: ANEXO }],
  ['negociacao', 'nomeCedente', 'Nome', 'TEXT', { description: 'Nome do cedente' }],
  ['negociacao', 'numeroPrecatorio', 'Nº Precatório', 'TEXT'],
  ['negociacao', 'numeroProcesso', 'Nº Processo', 'TEXT'],
  ['negociacao', 'percentualDesembolso', 'Percentual Desembolso', 'NUMBER', { settings: { dataType: 'float', decimals: 2 } }],
  ['negociacao', 'propostaInicial', 'Proposta Inicial ($)', 'CURRENCY'],
  ['negociacao', 'telefone', 'Telefone', 'TEXT'],
  ['negociacao', 'valorOficio', 'Valor (Ofício)', 'CURRENCY'],
  ['negociacao', 'valorCedente', 'Valor Cedente', 'CURRENCY'],
  ['negociacao', 'valorComissao', 'Valor Comissão', 'CURRENCY'],
  ['negociacao', 'valorDesembolso', 'Valor Desembolso', 'CURRENCY'],

  // ─── ANÁLISE JURÍDICA (Toga) ─────────────────────────────────────────────
  ['analiseJuridica', 'anexoCalculoAtualizado', 'Anexo - Cálculo Atualizado', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoCalculosHomologados', 'Anexo - Cálculos Homologados', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoCalculosPreAnalise', 'Anexo - Cálculos Pré Análise', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoOficio', 'Anexo - Ofício', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoPrecatorio', 'Anexo - Precatório', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoProcesso', 'Anexo - Processo', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anexoSentencaAcordao', 'Anexo - Sentença / Acórdão', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'anoOrcamentario', 'Ano orçamentário (ano pagador pelo ente)', 'NUMBER', { settings: { dataType: 'int' } }],
  ['analiseJuridica', 'calculoAtualizadoValor', 'Cálculo Atualizado (Valor)', 'CURRENCY'],
  ['analiseJuridica', 'certidoesNegativasEstaduais', 'Certidões Negativas - Estaduais', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasJusticaEstadual1Grau', 'Certidões Negativas - Justiça Estadual 1º Grau', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasJusticaEstadual2Grau', 'Certidões Negativas - Justiça Estadual 2º Grau', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasJusticaFederalUnificada', 'Certidões Negativas - Justiça Federal Unificada', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasMunicipais', 'Certidões Negativas - Municipais', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasTrabalhistas', 'Certidões Negativas - Trabalhistas', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'certidoesNegativasUniao', 'Certidões Negativas - União', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'contratoHonorarios', 'Contrato Honorários', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'decisaoHomologatoria', 'Decisão Homologatória', 'TEXT', { description: ANEXO }],
  ['analiseJuridica', 'honorariosContratuaisPercentual', 'Honorários Contratuais (%)', 'NUMBER', { settings: { dataType: 'float', decimals: 2 } }],
  ['analiseJuridica', 'natureza', 'Natureza', 'SELECT', {
    options: [
      { label: 'Alimentar', value: 'ALIMENTAR', color: 'green', position: 0 },
      { label: 'Comum', value: 'COMUM', color: 'gray', position: 1 },
    ],
  }],
  ['analiseJuridica', 'numeroOficio', 'Número Ofício', 'TEXT'],
  ['analiseJuridica', 'observacoesPreAnalise', 'Observações Pré Análise', 'RICH_TEXT'],
  ['analiseJuridica', 'pendenciasProvidenciar', 'Pendências (Providenciar)', 'RICH_TEXT'],
  ['analiseJuridica', 'previsaoPagamentoAno', 'Previsão de pagamento (ano de orçamento do precatório)', 'NUMBER', { settings: { dataType: 'int' } }],
  ['analiseJuridica', 'protocolo', 'Protocolo', 'TEXT'],
  ['analiseJuridica', 'regime', 'Regime', 'TEXT'],

  // ─── PROCESSO ADMINISTRATIVO (Carimbo) ───────────────────────────────────
  ['processoAdministrativo', 'minutaContratoParticular', 'Minuta Contrato Particular', 'TEXT', { description: ANEXO }],
  ['processoAdministrativo', 'minutaEscrituraPublica', 'Minuta Escritura Pública', 'TEXT', { description: ANEXO }],
  ['processoAdministrativo', 'peticaoHomologacao', 'Petição de Homologação', 'TEXT', { description: ANEXO }],
  ['processoAdministrativo', 'paperPagamento', 'Paper (Pagamento)', 'TEXT', { description: ANEXO }],
  ['processoAdministrativo', 'aprovacaoComercial', 'Aprovação Comercial', 'BOOLEAN', { description: '⚠️ da lista "4. Aprovações (Comercial, Jurídico, Administrativo)" — virou 3 flags.' }],
  ['processoAdministrativo', 'aprovacaoJuridica', 'Aprovação Jurídica', 'BOOLEAN'],
  ['processoAdministrativo', 'aprovacaoAdministrativa', 'Aprovação Administrativa', 'BOOLEAN'],
  ['processoAdministrativo', 'autorizacaoResponsavelAdmFinanceiro', 'Autorização - Responsável Administrativo/Financeiro', 'TEXT', { description: '⚠️ nome de quem autorizou (pode virar relação p/ membro depois).' }],
  ['processoAdministrativo', 'autorizacaoResponsavelJuridico', 'Autorização - Responsável Jurídico', 'TEXT'],

  // ─── PAGAMENTO (Cofre) ───────────────────────────────────────────────────
  ['pagamento', 'contratoParticularAssinado', 'Contrato Particular Assinado', 'TEXT', { description: ANEXO }],
  ['pagamento', 'trasladoEscritura', 'Traslado - Escritura', 'TEXT', { description: ANEXO }],
];

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Em 2.25.0-dev o metadata API não tem mais object(input:{nameSingular}); só
// object(id) e objects(paging/filter). Buscamos todos os objetos de uma vez.
const OBJECTS_QUERY = `query {
  objects(paging: { first: 200 }) {
    edges { node {
      id
      nameSingular
      fields(paging: { first: 500 }) { edges { node { name } } }
    } }
  }
}`;

// options/settings são scalars JSON: precisam ir como objeto via variável
// (string JSON quebra no server com "options?.map is not a function").
const CREATE_MUTATION = `mutation($field: CreateFieldInput!) {
  createOneField(input: { field: $field }) { id name }
}`;

const createVariables = (f) => ({
  field: {
    objectMetadataId: f.objectMetadataId,
    name: f.name,
    label: f.label,
    type: f.type,
    isNullable: true,
    ...(f.description ? { description: f.description } : {}),
    ...(f.options ? { options: f.options } : {}),
    ...(f.settings ? { settings: f.settings } : {}),
    ...(f.defaultValue !== undefined ? { defaultValue: f.defaultValue } : {}),
  },
});

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const objetos = {};
const todosObjetos = (await gql(OBJECTS_QUERY)).objects.edges.map((e) => e.node);

for (const obj of ['negociacao', 'analiseJuridica', 'processoAdministrativo', 'pagamento']) {
  const node = todosObjetos.find((o) => o.nameSingular === obj);
  if (!node) throw new Error(`Objeto não encontrado: ${obj}`);
  objetos[obj] = {
    id: node.id,
    campos: new Set(node.fields.edges.map((e) => e.node.name)),
  };
  console.log(`Objeto ${obj}: id=${node.id} (${objetos[obj].campos.size} campos existentes)`);
}

const criados = [], pulados = [], falhos = [];

for (const [obj, name, label, type, extra = {}] of SPEC) {
  const alvo = objetos[obj];
  if (alvo.campos.has(name)) {
    pulados.push(`${obj}.${name} (já existe)`);
    continue;
  }
  const field = { objectMetadataId: alvo.id, name, label, type, ...extra };
  try {
    const data = await gql(CREATE_MUTATION, createVariables(field));
    criados.push(`${obj}.${name} (${type}) id=${data.createOneField.id}`);
    alvo.campos.add(name);
  } catch (e) {
    // 1ª retentativa sem description/settings (algumas versões rejeitam o shape)
    try {
      const minimal = { objectMetadataId: alvo.id, name, label, type };
      if (extra.options) minimal.options = extra.options;
      const data = await gql(CREATE_MUTATION, createVariables(minimal));
      criados.push(`${obj}.${name} (${type}, mínimo) id=${data.createOneField.id}`);
      alvo.campos.add(name);
    } catch (e2) {
      falhos.push(`${obj}.${name}: ${e2.message}`);
    }
  }
  await sleep(150);
}

console.log('\n════ RESUMO ════');
console.log(`Criados: ${criados.length}`);
criados.forEach((c) => console.log('  ✔ ' + c));
console.log(`Pulados: ${pulados.length}`);
pulados.forEach((p) => console.log('  ≈ ' + p));
console.log(`Falhos: ${falhos.length}`);
falhos.forEach((f) => console.log('  ✘ ' + f));
process.exit(falhos.length ? 2 : 0);

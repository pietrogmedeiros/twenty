// Necessidades do Jurídico (reunião de out/2026) no modelo do CRM.
// Uso: TWENTY_API_KEY=<jwt> node criar-juridico.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// O que faz:
//   1. Negociação: escopo do crédito (qual crédito, espólio, herdeiros) e
//      contexto da captação — o que o comercial precisa informar antes de
//      mandar para o jurídico
//   2. Análise Jurídica: pasta do processo, índice de correção, honorários,
//      situação de cada peça e de cada certidão, penhora/dívidas e os campos
//      que recebem o resultado da ferramenta externa de pré-análise
//   3. Objeto Acompanhamento Pós-Compra (cessão → recebimento ou nova cessão),
//      com Kanban por etapa — etapas PROVISÓRIAS até o jurídico mandar as dele
//   4. "Entrou na etapa em" nos funis (preenchido pelo módulo
//      precatur-stage-entry do servidor)
//   5. Regra de etapa: Negociação só entra em "Jurídico" com o escopo do
//      crédito preenchido (soma às regras que já existirem, não substitui)
//   6. Role do Jurídico edita o Acompanhamento Pós-Compra
//   7. Card do Kanban da Análise Jurídica só com o essencial
//   8. View "Com pendências" na Análise Jurídica (certidão não emitida ou peça
//      não encontrada/não expedida)
//
// O Pós-Compra é aberto pelo servidor (módulo precatur-juridico) quando um
// Pagamento ao cedente vira Pago; a relação com o Pagamento evita duplicar.
//
// Rodar depois de criar-regras-etapa.mjs e criar-espelho-juridico.mjs; depois
// rodar criar-chat.mjs de novo para o Pós-Compra ganhar o bate-papo.

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const API_KEY = process.env.TWENTY_API_KEY;

const ANEXO_SITUACAO = [
  { label: 'Localizado', value: 'LOCALIZADO', color: 'green', position: 0 },
  { label: 'Não encontrado', value: 'NAO_ENCONTRADO', color: 'red', position: 1 },
  { label: 'Ainda não expedido', value: 'NAO_EXPEDIDO', color: 'yellow', position: 2 },
  { label: 'Não se aplica', value: 'NAO_APLICAVEL', color: 'gray', position: 3 },
];

const CERTIDAO_SITUACAO = [
  { label: 'Negativa', value: 'NEGATIVA', color: 'green', position: 0 },
  { label: 'Positiva', value: 'POSITIVA', color: 'red', position: 1 },
  { label: 'Não emitida (pendência)', value: 'NAO_EMITIDA', color: 'yellow', position: 2 },
  { label: 'Não se aplica', value: 'NAO_APLICAVEL', color: 'gray', position: 3 },
];

const ENTROU_NA_ETAPA = {
  type: 'DATE_TIME',
  name: 'entrouNaEtapaEm',
  label: 'Entrou na etapa em',
  icon: 'IconCalendarEvent',
  description: 'Preenchido pelo sistema sempre que a etapa muda',
};

const NEGOCIACAO_FIELDS = [
  {
    type: 'SELECT',
    name: 'creditoEmAnalise',
    label: 'Crédito em análise',
    icon: 'IconUserDollar',
    description: 'Qual crédito do processo está sendo negociado',
    options: [
      { label: 'Da parte', value: 'PARTE', color: 'blue', position: 0 },
      { label: 'Do advogado (honorários)', value: 'ADVOGADO', color: 'purple', position: 1 },
      { label: 'Parte e advogado', value: 'AMBOS', color: 'turquoise', position: 2 },
      { label: 'Outro interessado', value: 'OUTRO', color: 'gray', position: 3 },
    ],
  },
  {
    type: 'TEXT',
    name: 'creditoOutroInteressado',
    label: 'Outro interessado',
    icon: 'IconUserQuestion',
    description: 'Quem é o titular quando o crédito em análise é de outro interessado',
  },
  {
    type: 'SELECT',
    name: 'escopoEspolio',
    label: 'Espólio',
    icon: 'IconUsersGroup',
    description: 'Em caso de espólio, de quem é a parte que está sendo negociada',
    options: [
      { label: 'Não é espólio', value: 'NAO_E_ESPOLIO', color: 'gray', position: 0 },
      { label: 'Herdeiro específico', value: 'HERDEIRO_ESPECIFICO', color: 'blue', position: 1 },
      { label: 'Todos os herdeiros', value: 'TODOS_HERDEIROS', color: 'turquoise', position: 2 },
      { label: 'Espólio integral', value: 'ESPOLIO_INTEGRAL', color: 'purple', position: 3 },
    ],
  },
  {
    type: 'TEXT',
    name: 'herdeirosEnvolvidos',
    label: 'Herdeiro(s) envolvido(s)',
    icon: 'IconUsers',
    description: 'Nome e CPF do(s) herdeiro(s) cuja parte está sendo negociada',
  },
  {
    type: 'RICH_TEXT',
    name: 'contextoCaptacao',
    label: 'Contexto da captação',
    icon: 'IconMessageCircle',
    description:
      'Como o caso chegou e o que foi combinado com o cedente — o jurídico lê isso antes de analisar',
  },
  ENTROU_NA_ETAPA,
];

const ANALISE_FIELDS = [
  {
    type: 'LINKS',
    name: 'pastaProcesso',
    label: 'Pasta do processo',
    icon: 'IconFolder',
    description: 'Link da pasta padronizada com o processo completo e o índice das peças',
  },
  {
    type: 'TEXT',
    name: 'indiceCorrecao',
    label: 'Índice de correção',
    icon: 'IconPercentage',
    description: 'Índice(s) de correção aplicável(is) ao crédito (ex.: IPCA-E, SELIC)',
  },
  {
    type: 'CURRENCY',
    name: 'calculoHonorarios',
    label: 'Cálculo de honorários',
    icon: 'IconCalculator',
    description: 'Valor dos honorários calculado pelo jurídico',
  },
  ...[
    ['situacaoSentenca', 'Sentença / acórdão'],
    ['situacaoCalculoHomologado', 'Cálculo homologado'],
    ['situacaoDecisaoHomologacao', 'Decisão de homologação'],
    ['situacaoOficioRequisitorio', 'Ofício requisitório'],
    ['situacaoContratoHonorarios', 'Contrato de honorários'],
  ].map(([name, label]) => ({
    type: 'SELECT',
    name,
    label: `Peça: ${label}`,
    icon: 'IconFileSearch',
    description: `Situação da peça "${label}" na pasta do processo`,
    options: ANEXO_SITUACAO,
  })),
  ...[
    ['situacaoCertidaoMunicipais', 'Municipais'],
    ['situacaoCertidaoEstaduais', 'Estaduais'],
    ['situacaoCertidaoUniao', 'União'],
    ['situacaoCertidaoTrabalhistas', 'Trabalhistas'],
    ['situacaoCertidaoJusticaEstadual1Grau', 'Justiça Estadual 1º grau'],
    ['situacaoCertidaoJusticaEstadual2Grau', 'Justiça Estadual 2º grau'],
    ['situacaoCertidaoJusticaFederal', 'Justiça Federal unificada'],
  ].map(([name, label]) => ({
    type: 'SELECT',
    name,
    label: `Certidão: ${label}`,
    icon: 'IconCertificate',
    description: `Resultado da certidão ${label} do cedente. "Não emitida" fica como pendência.`,
    options: CERTIDAO_SITUACAO,
  })),
  {
    type: 'TEXT',
    name: 'locaisResidenciaAnteriores',
    label: 'Locais de residência anteriores',
    icon: 'IconMapPin',
    description: 'Cidades/UF onde o cedente já morou (certidões também precisam sair de lá)',
  },
  {
    type: 'CURRENCY',
    name: 'valorPenhorado',
    label: 'Valor penhorado',
    icon: 'IconLock',
    description: 'Quanto do crédito está penhorado/bloqueado',
  },
  {
    type: 'RICH_TEXT',
    name: 'dividasExecucoes',
    label: 'Dívidas, execuções e penhoras',
    icon: 'IconAlertTriangle',
    description: 'O que a due diligence encontrou contra o cedente',
  },
  {
    type: 'LINKS',
    name: 'relatorioPreAnalise',
    label: 'Relatório da pré-análise',
    icon: 'IconRobot',
    description: 'Link do relatório gerado pela ferramenta de pré-análise',
  },
  {
    type: 'RICH_TEXT',
    name: 'temasStfStj',
    label: 'Temas STF/STJ relacionados',
    icon: 'IconScale',
    description: 'Temas afetados em julgamento que podem impactar o crédito',
  },
  ENTROU_NA_ETAPA,
];

const POS_COMPRA_OBJECT = {
  nameSingular: 'acompanhamentoPosCompra',
  namePlural: 'acompanhamentosPosCompra',
  labelSingular: 'Acompanhamento Pós-Compra',
  labelPlural: 'Pós-Compra',
  icon: 'IconGavel',
  description:
    'Acompanhamento jurídico depois da cessão, até o recebimento pela Precatur ou nova cessão (Precatur)',
};

// Provisórias: substituir pelas etapas que o jurídico (Victor) mandar
const POS_COMPRA_ETAPAS = [
  ['PETICIONAR_CESSAO', 'Peticionar cessão', 'blue'],
  ['AGUARDANDO_HOMOLOGACAO', 'Aguardando homologação da cessão', 'yellow'],
  ['CESSAO_HOMOLOGADA', 'Cessão homologada', 'turquoise'],
  ['CONFERENCIA_CALCULOS', 'Conferência de cálculos', 'sky'],
  ['IMPUGNACAO', 'Impugnação', 'orange'],
  ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento', 'purple'],
  ['RECEBIDO', 'Recebido pela Precatur', 'green'],
  ['CEDIDO_A_TERCEIRO', 'Cedido a terceiro', 'gray'],
];

const POS_COMPRA_FIELDS = [
  {
    type: 'SELECT',
    name: 'etapa',
    label: 'Etapa',
    icon: 'IconProgressCheck',
    defaultValue: `'${POS_COMPRA_ETAPAS[0][0]}'`,
    options: POS_COMPRA_ETAPAS.map(([value, label, color], position) => ({
      value,
      label,
      color,
      position,
    })),
  },
  {
    type: 'DATE_TIME',
    name: 'proximoPrazo',
    label: 'Próximo prazo',
    icon: 'IconAlarm',
  },
  {
    type: 'TEXT',
    name: 'proximoPrazoDescricao',
    label: 'O que vence no próximo prazo',
    icon: 'IconListDetails',
  },
  {
    type: 'DATE',
    name: 'ultimaIntimacaoEm',
    label: 'Última intimação em',
    icon: 'IconBell',
  },
  {
    type: 'RICH_TEXT',
    name: 'ultimaIntimacao',
    label: 'Última intimação',
    icon: 'IconBell',
    description: 'Resumo da última intimação/publicação relevante',
  },
  {
    type: 'CURRENCY',
    name: 'valorRecebido',
    label: 'Valor recebido',
    icon: 'IconCash',
  },
  {
    type: 'DATE',
    name: 'dataRecebimento',
    label: 'Data do recebimento',
    icon: 'IconCalendarDollar',
  },
  {
    type: 'TEXT',
    name: 'novoCessionario',
    label: 'Novo cessionário',
    icon: 'IconBuildingBank',
    description: 'Para quem a Precatur cedeu o crédito, quando houver nova cessão',
  },
  {
    type: 'DATE',
    name: 'dataNovaCessao',
    label: 'Data da nova cessão',
    icon: 'IconCalendar',
  },
  {
    type: 'CURRENCY',
    name: 'valorNovaCessao',
    label: 'Valor da nova cessão',
    icon: 'IconCoin',
  },
  {
    type: 'RICH_TEXT',
    name: 'observacoes',
    label: 'Observações',
    icon: 'IconNotes',
  },
  ENTROU_NA_ETAPA,
];

const POS_COMPRA_RELATIONS = [
  ['precatorio', 'Precatório', 'IconFileInvoice', 'precatorio', 'Pós-Compra'],
  ['negociacao', 'Negociação', 'IconBriefcase', 'negociacao', 'Pós-Compra'],
  ['responsavelJuridico', 'Responsável jurídico', 'IconUserShield', 'workspaceMember', 'Pós-Compra (responsável)'],
  ['pagamento', 'Pagamento ao cedente', 'IconCash', 'pagamento', 'Pós-Compra'],
];

const POS_COMPRA_KANBAN = {
  name: 'Pós-compra por etapa',
  cardFields: ['name', 'precatorio', 'responsavelJuridico', 'proximoPrazo', 'entrouNaEtapaEm'],
};

// Card do Kanban da Análise Jurídica: o resto fica na página do registro
const ANALISE_CARD_FIELDS = [
  'name',
  'negociacao',
  'risco',
  'indiceCorrecao',
  'numeroOficio',
  'calculoHonorarios',
  'advogadoResponsavel',
  'entrouNaEtapaEm',
];

const ANALISE_PENDENCIAS_VIEW = {
  name: 'Com pendências',
  icon: 'IconAlertTriangle',
  columns: ['name', 'negociacao', 'status', 'advogadoResponsavel', 'pendenciasProvidenciar', 'entrouNaEtapaEm'],
  // Qualquer um destes (OU)
  filters: [
    ...ANALISE_FIELDS.filter((field) => field.name.startsWith('situacaoCertidao')).map(
      (field) => [field.name, ['NAO_EMITIDA']],
    ),
    ...ANALISE_FIELDS.filter(
      (field) => field.name.startsWith('situacao') && !field.name.startsWith('situacaoCertidao'),
    ).map((field) => [field.name, ['NAO_ENCONTRADO', 'NAO_EXPEDIDO']]),
  ],
};

// Só entra em "Jurídico" com o escopo do crédito definido
const JURIDICO_STAGE_RULE = {
  objectNameSingular: 'negociacao',
  stageFieldName: 'status',
  stageValue: 'JURIDICO_NO_PIPELINE',
  requiredFieldNames: [
    'numeroProcesso',
    'cedente',
    'cpfCnpjCedente',
    'creditoEmAnalise',
    'escopoEspolio',
    'contextoCaptacao',
  ],
};

async function gql(path, query, variables) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const metadata = (query, variables) => gql('/metadata', query, variables);
const core = (query, variables) => gql('/graphql', query, variables);

let objects = [];
const loadObjects = async () => {
  objects = (
    await metadata(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular namePlural
          fields(paging: { first: 500 }) { edges { node { id name } } }
        } }
      }
    }`)
  ).objects.edges.map((edge) => edge.node);
};
const objectByName = (name) => objects.find((object) => object.nameSingular === name);
const fieldId = (object, name) =>
  object.fields.edges.find((edge) => edge.node.name === name)?.node.id;

const ensureFields = async (objectName, fields) => {
  const object = objectByName(objectName);
  for (const field of fields) {
    if (fieldId(object, field.name)) {
      console.log(`  ${objectName}.${field.name} já existe`);
      continue;
    }
    await metadata(
      `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
      { input: { field: { ...field, objectMetadataId: object.id } } },
    );
    console.log(`  ${objectName}.${field.name} criado`);
  }
};

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

await loadObjects();
for (const name of ['negociacao', 'analiseJuridica', 'precatorio', 'pagamento']) {
  if (!objectByName(name)) {
    console.error(`Objeto ${name} não existe neste workspace`);
    process.exit(1);
  }
}

// 1 e 2. Campos da Negociação e da Análise Jurídica
console.log('Negociação');
await ensureFields('negociacao', NEGOCIACAO_FIELDS);
console.log('Análise Jurídica');
await ensureFields('analiseJuridica', ANALISE_FIELDS);

// 3. Acompanhamento Pós-Compra
console.log('Acompanhamento Pós-Compra');
if (objectByName(POS_COMPRA_OBJECT.nameSingular)) {
  console.log('  objeto já existe');
} else {
  await metadata(
    `mutation($input: CreateOneObjectInput!) { createOneObject(input: $input) { id } }`,
    { input: { object: POS_COMPRA_OBJECT } },
  );
  console.log('  objeto criado');
  await loadObjects();
}
await ensureFields(POS_COMPRA_OBJECT.nameSingular, POS_COMPRA_FIELDS);
const posCompra = objectByName(POS_COMPRA_OBJECT.nameSingular);
for (const [name, label, icon, target, targetFieldLabel] of POS_COMPRA_RELATIONS) {
  if (fieldId(posCompra, name)) {
    console.log(`  relação ${label} já existe`);
    continue;
  }
  await metadata(
    `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
    {
      input: {
        field: {
          objectMetadataId: posCompra.id,
          type: 'RELATION',
          name,
          label,
          icon,
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: objectByName(target).id,
            targetFieldLabel,
            targetFieldIcon: 'IconGavel',
          },
        },
      },
    },
  );
  console.log(`  relação ${label} criada`);
}

// 4. Entrou na etapa em (Filial Salvador, se o funil existir neste workspace)
if (objectByName('oportunidadeSalvador')) {
  await ensureFields('oportunidadeSalvador', [ENTROU_NA_ETAPA]);
}

await loadObjects();

// Kanban do Pós-Compra
const posCompraAtual = objectByName(POS_COMPRA_OBJECT.nameSingular);
const { getViews } = await metadata(
  `query($id: String) { getViews(objectMetadataId: $id) { id name } }`,
  { id: posCompraAtual.id },
);
if (getViews.some((view) => view.name === POS_COMPRA_KANBAN.name)) {
  console.log(`  view ${POS_COMPRA_KANBAN.name} já existe`);
} else {
  const { createView } = await metadata(
    `mutation($input: CreateViewInput!) { createView(input: $input) { id } }`,
    {
      input: {
        name: POS_COMPRA_KANBAN.name,
        icon: 'IconLayoutKanban',
        objectMetadataId: posCompraAtual.id,
        type: 'KANBAN',
        mainGroupByFieldMetadataId: fieldId(posCompraAtual, 'etapa'),
        visibility: 'WORKSPACE',
        position: 1,
      },
    },
  );
  await metadata(
    `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
    {
      inputs: POS_COMPRA_KANBAN.cardFields.map((name, position) => ({
        viewId: createView.id,
        fieldMetadataId: fieldId(posCompraAtual, name),
        isVisible: true,
        position,
      })),
    },
  );
  console.log(`  view ${POS_COMPRA_KANBAN.name} criada`);
}

// 7. Card do Kanban da Análise Jurídica
const analise = objectByName('analiseJuridica');
const loadViews = async (objectMetadataId) =>
  (
    await metadata(
      `query($id: String) {
        getViews(objectMetadataId: $id) {
          id name type viewFields { id fieldMetadataId isVisible position }
        }
      }`,
      { id: objectMetadataId },
    )
  ).getViews;
let analiseViews = await loadViews(analise.id);
if (!analiseViews.some((view) => view.type === 'KANBAN')) {
  await metadata(
    `mutation($input: CreateViewInput!) { createView(input: $input) { id } }`,
    {
      input: {
        name: 'Jurídico por status',
        icon: 'IconLayoutKanban',
        objectMetadataId: analise.id,
        type: 'KANBAN',
        mainGroupByFieldMetadataId: fieldId(analise, 'status'),
        visibility: 'WORKSPACE',
        position: 1,
      },
    },
  );
  console.log('Análise Jurídica: Kanban por status criado');
  analiseViews = await loadViews(analise.id);
}
const cardFieldIds = ANALISE_CARD_FIELDS.map((name) => fieldId(analise, name)).filter(Boolean);
for (const view of analiseViews.filter((item) => item.type === 'KANBAN')) {
  const toCreate = [];
  for (const [position, id] of cardFieldIds.entries()) {
    const existing = view.viewFields.find((vf) => vf.fieldMetadataId === id);
    if (!existing) {
      toCreate.push({ viewId: view.id, fieldMetadataId: id, isVisible: true, position });
    } else if (!existing.isVisible || existing.position !== position) {
      await metadata(
        `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
        { input: { id: existing.id, update: { isVisible: true, position } } },
      );
    }
  }
  if (toCreate.length > 0) {
    await metadata(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      { inputs: toCreate },
    );
  }
  for (const viewField of view.viewFields) {
    if (viewField.isVisible && !cardFieldIds.includes(viewField.fieldMetadataId)) {
      await metadata(
        `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
        { input: { id: viewField.id, update: { isVisible: false } } },
      );
    }
  }
  console.log(`Análise Jurídica: card do Kanban "${view.name}" configurado`);
}

// 8. View "Com pendências"
if (analiseViews.some((view) => view.name === ANALISE_PENDENCIAS_VIEW.name)) {
  console.log(`Análise Jurídica: view ${ANALISE_PENDENCIAS_VIEW.name} já existe`);
} else {
  const { createView: pendenciasView } = await metadata(
    `mutation($input: CreateViewInput!) { createView(input: $input) { id } }`,
    {
      input: {
        name: ANALISE_PENDENCIAS_VIEW.name,
        icon: ANALISE_PENDENCIAS_VIEW.icon,
        objectMetadataId: analise.id,
        type: 'TABLE',
        visibility: 'WORKSPACE',
        position: 2,
      },
    },
  );
  await metadata(
    `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
    {
      inputs: ANALISE_PENDENCIAS_VIEW.columns
        .map((name) => fieldId(analise, name))
        .filter(Boolean)
        .map((fieldMetadataId, position) => ({
          viewId: pendenciasView.id,
          fieldMetadataId,
          isVisible: true,
          position,
        })),
    },
  );
  const { createViewFilterGroup } = await metadata(
    `mutation($input: CreateViewFilterGroupInput!) { createViewFilterGroup(input: $input) { id } }`,
    { input: { viewId: pendenciasView.id, logicalOperator: 'OR' } },
  );
  for (const [position, [name, values]] of ANALISE_PENDENCIAS_VIEW.filters.entries()) {
    await metadata(
      `mutation($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id } }`,
      {
        input: {
          viewId: pendenciasView.id,
          viewFilterGroupId: createViewFilterGroup.id,
          positionInViewFilterGroup: position,
          fieldMetadataId: fieldId(analise, name),
          operand: 'IS',
          // Seleção: o front guarda a lista de opções como texto JSON
          value: JSON.stringify(values),
        },
      },
    );
  }
  console.log(`Análise Jurídica: view ${ANALISE_PENDENCIAS_VIEW.name} criada`);
}

// 5. Regra de etapa "Jurídico" (soma aos campos que o cliente já configurou)
if (!objectByName('regraEtapa')) {
  console.warn('Regras de etapa não ativadas neste workspace (rode criar-regras-etapa.mjs)');
} else {
  const { regrasEtapa } = await core(
    `query($filter: RegraEtapaFilterInput) {
      regrasEtapa(filter: $filter) { edges { node { id requiredFieldNames } } }
    }`,
    {
      filter: {
        objectNameSingular: { eq: JURIDICO_STAGE_RULE.objectNameSingular },
        stageFieldName: { eq: JURIDICO_STAGE_RULE.stageFieldName },
        stageValue: { eq: JURIDICO_STAGE_RULE.stageValue },
      },
    },
  );
  const [existing, ...duplicates] = regrasEtapa.edges.map((edge) => edge.node);
  if (existing) {
    // Regras repetidas para a mesma etapa: junta tudo numa só (o servidor só
    // considera uma delas) e apaga as cópias
    const fieldsOf = (rule) => (Array.isArray(rule.requiredFieldNames) ? rule.requiredFieldNames : []);
    const current = fieldsOf(existing);
    const merged = [
      ...new Set([...current, ...duplicates.flatMap(fieldsOf), ...JURIDICO_STAGE_RULE.requiredFieldNames]),
    ];
    if (merged.length === current.length) {
      console.log('Regra de etapa Jurídico já tem os campos');
    } else {
      await core(
        `mutation($id: UUID!, $data: RegraEtapaUpdateInput!) { updateRegraEtapa(id: $id, data: $data) { id } }`,
        { id: existing.id, data: { requiredFieldNames: merged } },
      );
      console.log(`Regra de etapa Jurídico atualizada: ${merged.join(', ')}`);
    }
    for (const duplicate of duplicates) {
      await core(`mutation($id: UUID!) { deleteRegraEtapa(id: $id) { id } }`, { id: duplicate.id });
      console.log('Regra de etapa Jurídico duplicada apagada');
    }
  } else {
    await core(
      `mutation($data: RegraEtapaCreateInput!) { createRegraEtapa(data: $data) { id } }`,
      { data: { name: 'Negociação → Jurídico', ...JURIDICO_STAGE_RULE } },
    );
    console.log('Regra de etapa Jurídico criada');
  }
}

// 6. Role do Jurídico edita o Pós-Compra
const { getRoles } = await metadata(`query {
  getRoles {
    id label canUpdateAllObjectRecords
    objectPermissions {
      objectMetadataId canReadObjectRecords canUpdateObjectRecords
      canSoftDeleteObjectRecords canDestroyObjectRecords
    }
  }
}`);
for (const role of getRoles.filter((item) => /jur[ií]dico/i.test(item.label))) {
  if (role.canUpdateAllObjectRecords) continue;
  if (
    role.objectPermissions.some(
      (permission) =>
        permission.objectMetadataId === posCompraAtual.id && permission.canUpdateObjectRecords,
    )
  ) {
    console.log(`Role ${role.label} já edita o Pós-Compra`);
    continue;
  }
  // upsertObjectPermissions SUBSTITUI a lista inteira da role: reenvia as atuais
  const kept = role.objectPermissions
    .filter((permission) => permission.objectMetadataId !== posCompraAtual.id)
    .map(({ objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords, canDestroyObjectRecords }) => ({
      objectMetadataId,
      canReadObjectRecords,
      canUpdateObjectRecords,
      canSoftDeleteObjectRecords,
      canDestroyObjectRecords,
    }));
  await metadata(
    `mutation($input: UpsertObjectPermissionsInput!) {
      upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId }
    }`,
    {
      input: {
        roleId: role.id,
        objectPermissions: [
          ...kept,
          {
            objectMetadataId: posCompraAtual.id,
            canReadObjectRecords: true,
            canUpdateObjectRecords: true,
            canSoftDeleteObjectRecords: true,
            canDestroyObjectRecords: false,
          },
        ],
      },
    },
  );
  console.log(`Role ${role.label} agora edita o Pós-Compra`);
}

console.log('Pronto. Recarregue a página (F5).');

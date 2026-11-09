// Pós-Compra com as etapas do jurídico (retorno do Victor, nov/2026)
// Uso: TWENTY_API_KEY=<jwt> node atualizar-pos-compra.mjs [http://localhost:3000] [--aplicar]
// Sem --aplicar só mostra o que faria. Idempotente. Rodar depois de criar-juridico.mjs.
//
//   1. Campos novos: situação da conferência de cálculos, situação da
//      impugnação (as duas deixam de ser etapa e ficam dentro de "Aguardando
//      pagamento"), previsão de pagamento e marcos de alerta já enviados.
//   2. Cards em "Conferência de cálculos"/"Impugnação" vão para "Aguardando
//      pagamento" com a situação preenchida; depois as duas etapas saem.
//   3. Previsão de pagamento no card do Kanban.
// Os alertas (6, 3 e 1 mês antes da previsão) são tarefas na Agenda criadas
// pelo servidor todo dia às 8h (cron:precatur:payment-alerts).
// Depois: node corrigir-colunas-kanban.mjs <url> --aplicar, se sobrar coluna velha.

const BASE_URL = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const APPLY = process.argv.includes('--aplicar');
const API_KEY = process.env.TWENTY_API_KEY;

const OBJECT_NAME = 'acompanhamentoPosCompra';
const REMOVED_STAGES = ['CONFERENCIA_CALCULOS', 'IMPUGNACAO'];

const option = ([value, label, color], position) => ({ value, label, color, position });

const NEW_FIELDS = [
  {
    type: 'SELECT',
    name: 'situacaoConferenciaCalculos',
    label: 'Conferência de cálculos',
    icon: 'IconCalculator',
    description: 'Conferência dos cálculos enquanto aguarda o pagamento',
    options: [
      ['PENDENTE', 'Pendente', 'yellow'],
      ['CONFERIDO', 'Conferido', 'green'],
      ['DIVERGENTE', 'Divergente', 'red'],
    ].map(option),
  },
  {
    type: 'SELECT',
    name: 'situacaoImpugnacao',
    label: 'Impugnação',
    icon: 'IconScale',
    description: 'Impugnação dos cálculos, quando houver divergência',
    options: [
      ['NAO_NECESSARIA', 'Não necessária', 'gray'],
      ['A_PROTOCOLAR', 'A protocolar', 'yellow'],
      ['PROTOCOLADA', 'Protocolada', 'blue'],
      ['DECIDIDA', 'Decidida', 'green'],
    ].map(option),
  },
  {
    type: 'DATE',
    name: 'previsaoPagamento',
    label: 'Previsão de pagamento',
    icon: 'IconCalendarDollar',
    description:
      'Data prevista do pagamento pelo ente. Gera tarefas na Agenda 6, 3 e 1 mês antes; mudar a data reinicia os alertas',
  },
  {
    type: 'MULTI_SELECT',
    name: 'alertasPagamentoEnviados',
    label: 'Alertas de pagamento enviados',
    icon: 'IconBellCheck',
    description: 'Preenchido pelo sistema; limpar faz o alerta sair de novo',
    options: [
      ['SEIS_MESES', '6 meses', 'blue'],
      ['TRES_MESES', '3 meses', 'orange'],
      ['UM_MES', '1 mês', 'red'],
    ].map(option),
  },
];

// Situação gravada no card que sai da etapa antiga
const STAGE_MIGRATION = {
  CONFERENCIA_CALCULOS: { situacaoConferenciaCalculos: 'PENDENTE' },
  IMPUGNACAO: { situacaoConferenciaCalculos: 'DIVERGENTE', situacaoImpugnacao: 'PROTOCOLADA' },
};

async function gql(path, query, variables) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}
const metadata = (query, variables) => gql('/metadata', query, variables);
const core = (query, variables) => gql('/graphql', query, variables);

const run = async (description, action) => {
  console.log(`  ${APPLY ? '' : '[simulação] '}${description}`);
  if (APPLY) return action();
};

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const loadObject = async () =>
  (
    await metadata(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular namePlural
          fields(paging: { first: 500 }) { edges { node { id name type options } } }
        } }
      }
    }`)
  ).objects.edges
    .map((edge) => edge.node)
    .find((object) => object.nameSingular === OBJECT_NAME);

let object = await loadObject();
if (!object) {
  console.error(`Objeto ${OBJECT_NAME} não existe — rode criar-juridico.mjs antes`);
  process.exit(1);
}
const fieldOf = (name) => object.fields.edges.find((edge) => edge.node.name === name)?.node;

// 1. Campos
console.log('1. Campos novos');
for (const field of NEW_FIELDS) {
  if (fieldOf(field.name)) {
    console.log(`  ${field.name} já existe`);
    continue;
  }
  await run(`criar ${field.name}`, () =>
    metadata(
      `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
      { input: { field: { ...field, objectMetadataId: object.id } } },
    ),
  );
}
if (APPLY) object = await loadObject();

// 2. Etapas
console.log('2. Etapas');
const etapa = fieldOf('etapa');
const currentOptions = [...(etapa?.options ?? [])].sort((a, b) => a.position - b.position);
const stagesToRemove = currentOptions.filter((item) => REMOVED_STAGES.includes(item.value));
if (stagesToRemove.length === 0) {
  console.log('  etapas já atualizadas');
} else {
  for (const stage of stagesToRemove) {
    const { [object.namePlural]: connection } = await core(`query {
      ${object.namePlural}(first: 200, filter: { etapa: { in: [${stage.value}] } }) { edges { node { id name } } }
    }`);
    for (const { node } of connection.edges) {
      await run(`"${node.name}": ${stage.label} → Aguardando pagamento`, () =>
        core(
          `mutation($id: UUID!, $data: ${capitalize(OBJECT_NAME)}UpdateInput!) { update${capitalize(OBJECT_NAME)}(id: $id, data: $data) { id } }`,
          { id: node.id, data: { etapa: 'AGUARDANDO_PAGAMENTO', ...STAGE_MIGRATION[stage.value] } },
        ),
      );
    }
  }
  const keptOptions = currentOptions
    .filter((item) => !REMOVED_STAGES.includes(item.value))
    .map(({ id, value, label, color }, position) => ({ id, value, label, color, position }));
  await run(`etapas: ${keptOptions.map((item) => item.label).join(' → ')}`, () =>
    metadata(
      `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
      { input: { id: etapa.id, update: { options: keptOptions } } },
    ),
  );
}

// 3. Previsão de pagamento no card do Kanban
console.log('3. Card do Kanban');
const previsao = fieldOf('previsaoPagamento');
const { getViews } = await metadata(
  `query($id: String) { getViews(objectMetadataId: $id) { id name type viewFields { id fieldMetadataId position } } }`,
  { id: object.id },
);
for (const view of getViews.filter((item) => item.type === 'KANBAN')) {
  if (!previsao) {
    console.log(`  ${view.name}: previsão entra depois de criar o campo (rode com --aplicar)`);
    continue;
  }
  if (view.viewFields.some((viewField) => viewField.fieldMetadataId === previsao.id)) {
    console.log(`  ${view.name}: já mostra a previsão`);
    continue;
  }
  await run(`${view.name}: mostrar previsão de pagamento`, () =>
    metadata(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      {
        inputs: [
          {
            viewId: view.id,
            fieldMetadataId: previsao.id,
            isVisible: true,
            position: Math.max(0, ...view.viewFields.map((viewField) => viewField.position)) + 1,
          },
        ],
      },
    ),
  );
}

console.log(APPLY ? 'Pronto.' : 'Simulação. Rode de novo com --aplicar.');

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

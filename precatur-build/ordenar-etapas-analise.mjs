// Coloca as etapas da Análise Jurídica na ordem do fluxo do jurídico:
// Pré Análise Automática → Due → Análise Definitiva → decisões.
// Uso: TWENTY_API_KEY=<jwt> node ordenar-etapas-analise.mjs [http://localhost:3000]
// Idempotente. Só muda a ordem (id, valor, rótulo e cor ficam): os registros
// continuam onde estão. As regras de etapa usam essa ordem para saber o que é
// "avançar". Depois, rodar corrigir-colunas-kanban.mjs --aplicar para as
// colunas do Kanban seguirem a ordem nova.

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const API_KEY = process.env.TWENTY_API_KEY;

const ORDER = [
  'PRE_ANALISE_AUTOMATICA',
  'DUE',
  'ANALISE_DEFINITIVA',
  'APROVADO',
  'COM_RESSALVAS',
  'REPROVADO',
];

async function gql(query, variables) {
  const res = await fetch(`${BASE_URL}/metadata`, {
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

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const { objects } = await gql(`query {
  objects(paging: { first: 200 }) {
    edges { node {
      nameSingular
      fields(paging: { first: 500 }) { edges { node { id name options } } }
    } }
  }
}`);
const statusField = objects.edges
  .map((edge) => edge.node)
  .find((node) => node.nameSingular === 'analiseJuridica')
  ?.fields.edges.map((edge) => edge.node)
  .find((field) => field.name === 'status');

if (!statusField) {
  console.error('Análise Jurídica sem campo status neste workspace');
  process.exit(1);
}

// Opções fora da lista (criadas depois) vão para o fim, na ordem atual
const rank = (option) => {
  const index = ORDER.indexOf(option.value);
  return index === -1 ? ORDER.length + option.position : index;
};
const current = [...statusField.options].sort((a, b) => a.position - b.position);
const reordered = [...current]
  .sort((a, b) => rank(a) - rank(b))
  .map((option, position) => ({ ...option, position }));

if (reordered.every((option, index) => option.id === current[index].id)) {
  console.log('Etapas da Análise Jurídica já estão na ordem');
  process.exit(0);
}

await gql(
  `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
  { input: { id: statusField.id, update: { options: reordered } } },
);
console.log(`Nova ordem: ${reordered.map((option) => option.label).join(' → ')}`);

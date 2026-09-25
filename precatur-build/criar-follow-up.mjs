// Campos do follow-up automático por WhatsApp em Negociação.
// Uso: TWENTY_API_KEY=<jwt> node criar-follow-up.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// Rodar ANTES de subir a imagem com o módulo precatur-follow-up: o servidor
// grava nesses campos assim que um negócio entra em "Em negociação".
// O envio pelo Chatwoot é configurado por variáveis de ambiente
// (PRECATUR_CHATWOOT_*, PRECATUR_FOLLOW_UP_TEMPLATES); sem elas, simula.

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;

const OBJECT_NAME = 'negociacao';

const FIELDS = [
  {
    type: 'SELECT',
    name: 'followUpStatus',
    label: 'Follow-up',
    icon: 'IconBrandWhatsapp',
    description:
      'Follow-up automático por WhatsApp. Mude para Pausado para não enviar mais.',
    options: [
      { label: 'Ativo', value: 'ATIVO', color: 'green', position: 0 },
      { label: 'Pausado', value: 'PAUSADO', color: 'gray', position: 1 },
      { label: 'Respondeu', value: 'RESPONDEU', color: 'blue', position: 2 },
      { label: 'Concluído', value: 'CONCLUIDO', color: 'purple', position: 3 },
      { label: 'Saiu da etapa', value: 'SAIU_DA_ETAPA', color: 'gray', position: 4 },
      { label: 'Sem telefone', value: 'SEM_TELEFONE', color: 'red', position: 5 },
    ],
  },
  {
    type: 'NUMBER',
    name: 'followUpEnviados',
    label: 'Follow-ups enviados',
    icon: 'IconSend',
    description: 'Quantos follow-ups de WhatsApp já foram enviados (0 a 3)',
  },
  {
    type: 'DATE_TIME',
    name: 'followUpProximoEm',
    label: 'Próximo follow-up',
    icon: 'IconClock',
    description: 'Quando o próximo follow-up (ou a tarefa de ligar) acontece',
  },
  {
    type: 'DATE_TIME',
    name: 'followUpIniciadoEm',
    label: 'Entrou em negociação em',
    icon: 'IconCalendarEvent',
    description: 'Início da sequência de follow-up (dias 1, 3 e 7 contam daqui)',
  },
];

// Mostrado no card do Kanban, depois dos campos que já estão lá
const KANBAN_FIELD_NAME = 'followUpStatus';

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
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

const loadObject = async () =>
  (
    await gql(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular
          fields(paging: { first: 500 }) { edges { node { id name } } }
        } }
      }
    }`)
  ).objects.edges
    .map((edge) => edge.node)
    .find((node) => node.nameSingular === OBJECT_NAME);

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

let object = await loadObject();
if (!object) {
  console.error(`Objeto ${OBJECT_NAME} não existe neste workspace`);
  process.exit(1);
}
const fieldId = (name) =>
  object.fields.edges.find((edge) => edge.node.name === name)?.node.id;

for (const field of FIELDS) {
  if (fieldId(field.name)) {
    console.log(`Campo ${field.label} já existe`);
    continue;
  }
  await gql(
    `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
    { input: { field: { ...field, objectMetadataId: object.id } } },
  );
  console.log(`Campo ${field.label} criado`);
}
object = await loadObject();

const { getViews } = await gql(
  `query($id: String) {
    getViews(objectMetadataId: $id) {
      id name type viewFields { id fieldMetadataId isVisible position }
    }
  }`,
  { id: object.id },
);

for (const view of getViews.filter((v) => v.type === 'KANBAN' || v.type === 'TABLE')) {
  const id = fieldId(KANBAN_FIELD_NAME);
  const existing = view.viewFields.find((vf) => vf.fieldMetadataId === id);
  if (existing?.isVisible) continue;
  const position =
    Math.max(0, ...view.viewFields.filter((vf) => vf.isVisible).map((vf) => vf.position)) + 1;
  if (existing) {
    await gql(
      `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
      { input: { id: existing.id, update: { isVisible: true, position } } },
    );
  } else {
    await gql(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      { inputs: [{ viewId: view.id, fieldMetadataId: id, isVisible: true, position }] },
    );
  }
  console.log(`  ${view.name}: Follow-up visível`);
}

console.log('Pronto. Recarregue a página (F5).');

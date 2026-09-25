// Agenda interna (estilo Bitrix) em cima de Tarefas, sem código novo no Twenty.
// Uso: TWENTY_API_KEY=<jwt> node criar-agenda.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// O que faz:
//   1. Liga a visão Dia/Semana do calendário (flag de Lab
//      IS_CALENDAR_WEEK_VIEW_ENABLED; sem ela só existe a visão Mês)
//   2. Cria em Tarefas os campos "Tipo de atividade" (Seleção com cor) e
//      "Término" (o início é a Data de vencimento padrão da tarefa)
//   3. Cria a view de calendário "Agenda" e põe no menu lateral. Uma só: cada
//      um filtra pelo Responsável que quer ver (o cliente achou redundante ter
//      "Minha agenda" separada)
//   4. Deixa as roles por setor (que só editam o próprio objeto) criar/editar
//      tarefas — sem isso a agenda é só leitura. O vínculo tarefa↔registro
//      (taskTarget) é objeto de sistema e não aceita permissão própria

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;

const TASK_FIELDS = [
  {
    type: 'SELECT',
    name: 'tipoAtividade',
    label: 'Tipo de atividade',
    icon: 'IconCategory',
    description: 'Tipo da atividade na agenda (Precatur)',
    options: [
      { label: 'Ligação', value: 'LIGACAO', color: 'blue', position: 0 },
      { label: 'Reunião', value: 'REUNIAO', color: 'purple', position: 1 },
      { label: 'Visita', value: 'VISITA', color: 'green', position: 2 },
      { label: 'Audiência / Prazo', value: 'AUDIENCIA_PRAZO', color: 'red', position: 3 },
      { label: 'Follow-up', value: 'FOLLOW_UP', color: 'orange', position: 4 },
      { label: 'Outro', value: 'OUTRO', color: 'gray', position: 5 },
    ],
  },
  {
    type: 'DATE_TIME',
    name: 'terminoEm',
    label: 'Término',
    icon: 'IconClockStop',
    description: 'Fim da atividade na agenda; o início é a Data de vencimento',
  },
];

const CARD_FIELDS = ['title', 'tipoAtividade', 'assignee', 'status'];

const VIEWS = [{ name: 'Agenda', icon: 'IconCalendarEvent' }];

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

const loadObjects = async () =>
  (
    await gql(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular
          fields(paging: { first: 500 }) { edges { node { id name } } }
        } }
      }
    }`)
  ).objects.edges.map((edge) => edge.node);

const loadTask = async () =>
  (await loadObjects()).find((node) => node.nameSingular === 'task');

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

await gql(
  `mutation($input: UpdateLabPublicFeatureFlagInput!) {
    updateLabPublicFeatureFlag(input: $input) { key value }
  }`,
  { input: { publicFeatureFlag: 'IS_CALENDAR_WEEK_VIEW_ENABLED', value: true } },
);
console.log('Visão Dia/Semana do calendário ligada');

let task = await loadTask();
const fieldId = (name) =>
  task.fields.edges.find((edge) => edge.node.name === name)?.node.id;

for (const field of TASK_FIELDS) {
  if (fieldId(field.name)) {
    console.log(`Campo ${field.label} já existe`);
    continue;
  }
  await gql(
    `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
    { input: { field: { ...field, objectMetadataId: task.id } } },
  );
  console.log(`Campo ${field.label} criado`);
}
task = await loadTask();

const { getViews: existingViews } = await gql(
  `query($id: String) { getViews(objectMetadataId: $id) { id name } }`,
  { id: task.id },
);

const { navigationMenuItems } = await gql(
  `query { navigationMenuItems { id type viewId targetObjectMetadataId position userWorkspaceId } }`,
);
const workspaceItems = navigationMenuItems.filter((item) => !item.userWorkspaceId);
// Logo depois de Tarefas no menu
const taskItemPosition =
  workspaceItems.find((item) => item.targetObjectMetadataId === task.id)?.position ??
  Math.max(0, ...workspaceItems.map((item) => item.position));

for (const [index, config] of VIEWS.entries()) {
  let viewId = existingViews.find((view) => view.name === config.name)?.id;

  if (viewId) {
    console.log(`View ${config.name} já existe`);
  } else {
    const { createView } = await gql(
      `mutation($input: CreateViewInput!) { createView(input: $input) { id } }`,
      {
        input: {
          name: config.name,
          icon: config.icon,
          objectMetadataId: task.id,
          type: 'CALENDAR',
          calendarLayout: 'WEEK',
          calendarFieldMetadataId: fieldId('dueAt'),
          calendarEndFieldMetadataId: fieldId('terminoEm'),
          visibility: 'WORKSPACE',
          position: 10 + index,
        },
      },
    );
    viewId = createView.id;

    await gql(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      {
        inputs: CARD_FIELDS.map((name, position) => ({
          viewId,
          fieldMetadataId: fieldId(name),
          isVisible: true,
          position,
        })),
      },
    );

    console.log(`View ${config.name} criada`);
  }

  if (workspaceItems.some((item) => item.viewId === viewId)) continue;
  await gql(
    `mutation($input: CreateNavigationMenuItemInput!) { createNavigationMenuItem(input: $input) { id } }`,
    {
      input: {
        type: 'VIEW',
        viewId,
        name: config.name,
        icon: config.icon,
        position: taskItemPosition + 0.1 * (index + 1),
      },
    },
  );
  console.log(`  ${config.name} adicionada ao menu lateral`);
}


const { getRoles } = await gql(`query {
  getRoles {
    id label canUpdateAllObjectRecords
    objectPermissions {
      objectMetadataId canReadObjectRecords canUpdateObjectRecords
      canSoftDeleteObjectRecords canDestroyObjectRecords
    }
  }
}`);
for (const role of getRoles.filter((item) => !item.canUpdateAllObjectRecords)) {
  // upsertObjectPermissions SUBSTITUI a lista inteira da role (apaga o que não
  // vier no input), então reenvia as permissões atuais junto com a de Tarefas
  const kept = role.objectPermissions
    .filter((permission) => permission.objectMetadataId !== task.id)
    .map(({ objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords, canDestroyObjectRecords }) => ({
      objectMetadataId,
      canReadObjectRecords,
      canUpdateObjectRecords,
      canSoftDeleteObjectRecords,
      canDestroyObjectRecords,
    }));
  await gql(
    `mutation($input: UpsertObjectPermissionsInput!) {
      upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId }
    }`,
    {
      input: {
        roleId: role.id,
        objectPermissions: [
          ...kept,
          {
            objectMetadataId: task.id,
            canReadObjectRecords: true,
            canUpdateObjectRecords: true,
            canSoftDeleteObjectRecords: true,
            canDestroyObjectRecords: false,
          },
        ],
      },
    },
  );
  console.log(`Role ${role.label}: pode criar/editar tarefas`);
}

console.log('Pronto. Recarregue a página (F5).');

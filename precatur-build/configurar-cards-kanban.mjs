// Cards do Kanban de Negociações com mais informação + campo de Tags colorido.
// Uso: TWENTY_API_KEY=<jwt> node configurar-cards-kanban.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// O que faz, no funil que existir no workspace (negociacao no principal,
// oportunidadeSalvador na Filial Salvador):
//   1. Cria o campo `tags` (Seleção múltipla, cada tag com sua cor)
//   2. Deixa no card do Kanban exatamente os campos de KANBAN_FIELDS, nessa
//      ordem, e esconde o resto (no principal a view vinha sem nenhum campo;
//      em Salvador mostrava criado/atualizado por/em)
//   3. Mostra Tags também na tabela

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;


const TAGS_FIELD = {
  type: 'MULTI_SELECT',
  name: 'tags',
  label: 'Tags',
  icon: 'IconTag',
  description: 'Etiquetas livres da negociação (Precatur)',
  options: [
    { label: 'Municipal', value: 'MUNICIPAL', color: 'blue', position: 0 },
    { label: 'Federal', value: 'FEDERAL', color: 'green', position: 1 },
    { label: 'Estadual', value: 'ESTADUAL', color: 'orange', position: 2 },
  ],
};

// Por funil: ordem em que os campos aparecem no card (o título vem primeiro)
const KANBAN_FIELDS = {
  negociacao: [
    'name',
    'tags',
    'responsavelComercial',
    'cedente',
    'valorOfertado',
    'dataFechamento',
  ],
  oportunidadeSalvador: [
    'name',
    'tags',
    'responsavel',
    'enteDevedor',
    'valorOficio',
    'dataFechamento',
  ],
};

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
    .find((node) => node.nameSingular in KANBAN_FIELDS);

const loadViews = async (objectMetadataId) =>
  (
    await gql(
      `query($id: String) {
        getViews(objectMetadataId: $id) {
          id name type
          viewFields { id fieldMetadataId isVisible position }
        }
      }`,
      { id: objectMetadataId },
    )
  ).getViews;

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

let object = await loadObject();
if (!object) {
  console.error(
    `Nenhum funil (${Object.keys(KANBAN_FIELDS).join(', ')}) neste workspace`,
  );
  process.exit(1);
}
console.log(`Funil: ${object.nameSingular}`);

const fieldId = (name) =>
  object.fields.edges.find((edge) => edge.node.name === name)?.node.id;

if (fieldId(TAGS_FIELD.name)) {
  console.log('Campo tags já existe (cores/opções não foram alteradas)');
} else {
  await gql(
    `mutation($input: CreateOneFieldMetadataInput!) {
      createOneField(input: $input) { id }
    }`,
    { input: { field: { ...TAGS_FIELD, objectMetadataId: object.id } } },
  );
  console.log('Campo tags criado');
  object = await loadObject();
}

const views = await loadViews(object.id);

const updateViewField = (id, update) =>
  gql(
    `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
    { input: { id, update } },
  );

const setCardFields = async (view, names) => {
  const wantedIds = names.map(fieldId);
  const toCreate = [];
  let changed = 0;
  for (const [position, name] of names.entries()) {
    const id = wantedIds[position];
    if (!id) {
      console.warn(`  campo ${name} não encontrado, pulando`);
      continue;
    }
    const existing = view.viewFields.find((vf) => vf.fieldMetadataId === id);
    if (!existing) {
      toCreate.push({ viewId: view.id, fieldMetadataId: id, isVisible: true, position });
    } else if (!existing.isVisible || existing.position !== position) {
      await updateViewField(existing.id, { isVisible: true, position });
      changed++;
    }
  }
  for (const vf of view.viewFields) {
    if (vf.isVisible && !wantedIds.includes(vf.fieldMetadataId)) {
      await updateViewField(vf.id, { isVisible: false, position: names.length + vf.position });
      changed++;
    }
  }
  if (toCreate.length > 0) {
    await gql(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      { inputs: toCreate },
    );
  }
  if (toCreate.length + changed > 0) {
    console.log(`  ${view.name}: ${toCreate.length} criado(s), ${changed} ajustado(s)`);
  }
};

for (const view of views.filter((v) => v.type === 'KANBAN')) {
  await setCardFields(view, KANBAN_FIELDS[object.nameSingular]);
}

for (const view of views.filter((v) => v.type === 'TABLE')) {
  const lastPosition = Math.max(0, ...view.viewFields.map((vf) => vf.position));
  const tagsId = fieldId('tags');
  const existing = view.viewFields.find((vf) => vf.fieldMetadataId === tagsId);
  if (existing?.isVisible) continue;
  if (existing) {
    await gql(
      `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
      { input: { id: existing.id, update: { isVisible: true, position: 1.5 } } },
    );
  } else {
    await gql(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      {
        inputs: [
          { viewId: view.id, fieldMetadataId: tagsId, isVisible: true, position: Math.min(1.5, lastPosition + 1) },
        ],
      },
    );
  }
  console.log(`  ${view.name}: Tags visível`);
}

console.log('Pronto. Recarregue a página (F5) para ver os cards novos.');

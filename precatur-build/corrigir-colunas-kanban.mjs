// Corrige colunas duplicadas nos Kanbans (cada etapa aparecia duas vezes:
// a view tinha dois grupos para o mesmo valor, criados em julho).
// Uso: TWENTY_API_KEY=<jwt> node corrigir-colunas-kanban.mjs [http://localhost:3000] [--aplicar]
// Sem --aplicar só mostra o que faria. Idempotente.
//
// Em cada view Kanban: deixa um grupo por etapa (prefere o visível), na ordem
// das opções do campo, todos visíveis; cria a coluna de etapa que faltar.
// A coluna "Sem valor" fica uma só, com a visibilidade que já tinha.

const BASE_URL = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const APPLY = process.argv.includes('--aplicar');
const API_KEY = process.env.TWENTY_API_KEY;

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

const run = async (description, query, variables) => {
  console.log(`    ${APPLY ? '' : '[simulação] '}${description}`);
  if (APPLY) await gql(query, variables);
};

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const { objects } = await gql(`query {
  objects(paging: { first: 200 }) {
    edges { node {
      id nameSingular
      fields(paging: { first: 500 }) { edges { node { id name label options } } }
    } }
  }
}`);

for (const object of objects.edges.map((edge) => edge.node)) {
  const { getViews } = await gql(
    `query($id: String) {
      getViews(objectMetadataId: $id) {
        id name type mainGroupByFieldMetadataId
        viewGroups { id fieldValue isVisible position }
      }
    }`,
    { id: object.id },
  );

  for (const view of getViews.filter((item) => item.type === 'KANBAN')) {
    const groupField = object.fields.edges
      .map((edge) => edge.node)
      .find((field) => field.id === view.mainGroupByFieldMetadataId);
    if (!groupField) continue;

    const options = [...(groupField.options ?? [])].sort((a, b) => a.position - b.position);
    const groupsByValue = new Map();
    for (const group of view.viewGroups) {
      groupsByValue.set(group.fieldValue, [...(groupsByValue.get(group.fieldValue) ?? []), group]);
    }

    const toDestroy = [];
    const kept = new Map();
    for (const [value, groups] of groupsByValue) {
      const [keep, ...rest] = [...groups].sort((a, b) => Number(b.isVisible) - Number(a.isVisible));
      kept.set(value, keep);
      toDestroy.push(...rest);
    }
    // Grupo de valor que não é mais opção do campo (opção apagada/renomeada)
    const optionValues = new Set(options.map((option) => option.value));
    for (const [value, group] of kept) {
      if (value !== '' && !optionValues.has(value)) {
        toDestroy.push(group);
        kept.delete(value);
      }
    }

    const updates = [];
    const creates = [];
    for (const [position, option] of options.entries()) {
      const group = kept.get(option.value);
      if (!group) {
        creates.push({ option, position });
      } else if (!group.isVisible || group.position !== position) {
        updates.push({ group, option, position });
      }
    }
    const emptyGroup = kept.get('');
    const emptyPosition = options.length;
    const moveEmpty = emptyGroup && emptyGroup.position !== emptyPosition;

    if (toDestroy.length + updates.length + creates.length === 0 && !moveEmpty) {
      console.log(`${object.nameSingular} › ${view.name}: ok`);
      continue;
    }
    console.log(`${object.nameSingular} › ${view.name}:`);

    for (const group of toDestroy) {
      await run(
        `apaga coluna duplicada "${group.fieldValue || 'Sem valor'}"`,
        `mutation($input: DestroyViewGroupInput!) { destroyViewGroup(input: $input) { id } }`,
        { input: { id: group.id } },
      );
    }
    for (const { group, option, position } of updates) {
      await run(
        `coluna "${option.label}": posição ${position}, visível`,
        `mutation($input: UpdateViewGroupInput!) { updateViewGroup(input: $input) { id } }`,
        { input: { id: group.id, update: { position, isVisible: true } } },
      );
    }
    for (const { option, position } of creates) {
      await run(
        `cria coluna "${option.label}" na posição ${position}`,
        `mutation($input: CreateViewGroupInput!) { createViewGroup(input: $input) { id } }`,
        { input: { viewId: view.id, fieldValue: option.value, isVisible: true, position } },
      );
    }
    if (moveEmpty) {
      await run(
        `coluna "Sem valor" para o fim`,
        `mutation($input: UpdateViewGroupInput!) { updateViewGroup(input: $input) { id } }`,
        { input: { id: emptyGroup.id, update: { position: emptyPosition } } },
      );
    }
  }
}

console.log(APPLY ? 'Pronto. Recarregue a página (F5).' : 'Simulação. Rode com --aplicar para corrigir.');

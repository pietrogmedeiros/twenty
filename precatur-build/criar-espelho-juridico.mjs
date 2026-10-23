// Etapa "Jurídico" da Negociação espelhada na Análise Jurídica.
// Uso: TWENTY_API_KEY=<jwt> node criar-espelho-juridico.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// O que faz:
//   1. Renomeia a opção "- {{Jurídico}} no pipeline." do Status da Negociação
//      para "Jurídico" (valor JURIDICO), mantendo o id: os negócios que já
//      estão nela continuam nela
//   2. Cria em Negociação o campo Decisão jurídica (mostrado no Kanban)
//   3. Cria a relação Análise Jurídica → Negociação
//   4. Confere se o Status da Análise Jurídica tem os valores que o servidor usa
//   5. Abre a Análise Jurídica dos negócios que já estão em "Jurídico" (o
//      servidor só espelha quando o negócio ENTRA na etapa)
//
// O módulo precatur-juridico do servidor só trava o negócio em workspace que
// tem o campo decisaoJuridica, então a ordem script/imagem tanto faz.

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const API_KEY = process.env.TWENTY_API_KEY;

const DEAL_OBJECT = 'negociacao';
const ANALYSIS_OBJECT = 'analiseJuridica';
const JURIDICO_VALUE = 'JURIDICO';
const ANALYSIS_STATUS_VALUES = ['PENDENTE', 'APROVADO', 'COM_RESSALVAS', 'REPROVADO'];

const DECISION_FIELD = {
  type: 'SELECT',
  name: 'decisaoJuridica',
  label: 'Decisão jurídica',
  icon: 'IconGavel',
  description:
    'Preenchido pelo sistema a partir da Análise Jurídica. O negócio só passa de "Jurídico" com Aprovado ou Com ressalvas.',
  options: [
    { label: 'Aguardando jurídico', value: 'AGUARDANDO', color: 'yellow', position: 0 },
    { label: 'Aprovado', value: 'APROVADO', color: 'green', position: 1 },
    { label: 'Com ressalvas', value: 'COM_RESSALVAS', color: 'orange', position: 2 },
    { label: 'Reprovado', value: 'REPROVADO', color: 'red', position: 3 },
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

const loadObjects = async () => {
  const nodes = (
    await metadata(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular namePlural
          fields(paging: { first: 500 }) { edges { node { id name label type options } } }
        } }
      }
    }`)
  ).objects.edges.map((edge) => edge.node);
  const find = (name) => nodes.find((node) => node.nameSingular === name);
  return { deal: find(DEAL_OBJECT), analysis: find(ANALYSIS_OBJECT) };
};

const field = (object, name) =>
  object.fields.edges.map((edge) => edge.node).find((node) => node.name === name);

const capitalize = (text) => text[0].toUpperCase() + text.slice(1);

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

let { deal, analysis } = await loadObjects();
if (!deal || !analysis) {
  console.error(`Faltam os objetos ${DEAL_OBJECT}/${ANALYSIS_OBJECT} neste workspace`);
  process.exit(1);
}

// 1. Opção "Jurídico" no Status da Negociação
const statusField = field(deal, 'status');
const options = statusField.options ?? [];
if (options.some((option) => option.value === JURIDICO_VALUE)) {
  console.log('Status: opção Jurídico já existe');
} else {
  const placeholder = options.find((option) => /jur[ií]dico/i.test(option.label));
  if (!placeholder) {
    console.error(
      `Status da Negociação não tem opção de Jurídico. Opções: ${options.map((option) => option.label).join(' | ')}`,
    );
    process.exit(1);
  }
  await metadata(
    `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
    {
      input: {
        id: statusField.id,
        update: {
          options: options.map((option) =>
            option.id === placeholder.id
              ? { ...option, label: 'Jurídico', value: JURIDICO_VALUE }
              : option,
          ),
        },
      },
    },
  );
  console.log(`Status: "${placeholder.label}" (${placeholder.value}) → "Jurídico" (${JURIDICO_VALUE})`);
}

// 2. Decisão jurídica na Negociação
if (field(deal, DECISION_FIELD.name)) {
  console.log('Campo Decisão jurídica já existe');
} else {
  await metadata(
    `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
    { input: { field: { ...DECISION_FIELD, objectMetadataId: deal.id } } },
  );
  console.log('Campo Decisão jurídica criado');
}

// 3. Relação Análise Jurídica → Negociação
if (field(analysis, 'negociacao')) {
  console.log('Relação Análise Jurídica → Negociação já existe');
} else {
  await metadata(
    `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
    {
      input: {
        field: {
          objectMetadataId: analysis.id,
          type: 'RELATION',
          name: 'negociacao',
          label: 'Negociação',
          icon: 'IconBriefcase',
          description: 'Negócio que mandou o caso para o jurídico',
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: deal.id,
            targetFieldLabel: 'Análises Jurídicas',
            targetFieldIcon: 'IconGavel',
          },
        },
      },
    },
  );
  console.log('Relação Análise Jurídica → Negociação criada');
}

({ deal, analysis } = await loadObjects());

// 4. Valores do Status da Análise Jurídica
const analysisValues = (field(analysis, 'status')?.options ?? []).map((option) => option.value);
const missingValues = ANALYSIS_STATUS_VALUES.filter((value) => !analysisValues.includes(value));
if (missingValues.length > 0) {
  console.warn(
    `ATENÇÃO: Status da Análise Jurídica sem ${missingValues.join(', ')} (tem: ${analysisValues.join(', ')}). O servidor não vai reconhecer essas decisões.`,
  );
}

// Decisão jurídica visível nas views (card do Kanban e tabela)
const decisionFieldId = field(deal, DECISION_FIELD.name).id;
const { getViews } = await metadata(
  `query($id: String) {
    getViews(objectMetadataId: $id) {
      id name type viewFields { id fieldMetadataId isVisible position }
    }
  }`,
  { id: deal.id },
);
for (const view of getViews.filter((v) => v.type === 'KANBAN' || v.type === 'TABLE')) {
  const existing = view.viewFields.find((vf) => vf.fieldMetadataId === decisionFieldId);
  if (existing?.isVisible) continue;
  const position =
    Math.max(0, ...view.viewFields.filter((vf) => vf.isVisible).map((vf) => vf.position)) + 1;
  if (existing) {
    await metadata(
      `mutation($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }`,
      { input: { id: existing.id, update: { isVisible: true, position } } },
    );
  } else {
    await metadata(
      `mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`,
      { inputs: [{ viewId: view.id, fieldMetadataId: decisionFieldId, isVisible: true, position }] },
    );
  }
  console.log(`  ${view.name}: Decisão jurídica visível`);
}

// 5. Negócios que já estavam em "Jurídico"
const dealsQuery = deal.namePlural;
const analysesQuery = analysis.namePlural;
const { [dealsQuery]: dealsPage } = await core(
  `query { ${dealsQuery}(filter: { status: { eq: ${JURIDICO_VALUE} } }, first: 200) {
    edges { node { id name precatorioId decisaoJuridica } }
  } }`,
);
const { [analysesQuery]: analysesPage } = await core(
  `query { ${analysesQuery}(first: 1000, orderBy: [{ createdAt: DescNullsLast }]) {
    edges { node { id status precatorioId negociacaoId } }
  } }`,
);
const analyses = analysesPage.edges.map((edge) => edge.node);
const decisionOf = (status) =>
  ['APROVADO', 'COM_RESSALVAS', 'REPROVADO'].includes(status) ? status : 'AGUARDANDO';

for (const { node: juridicoDeal } of dealsPage.edges) {
  let linked = analyses.find((item) => item.negociacaoId === juridicoDeal.id);
  if (!linked) {
    // Importadas do Bitrix ficaram presas só ao Precatório: adota em vez de duplicar
    const orphan = juridicoDeal.precatorioId
      ? analyses.find((item) => !item.negociacaoId && item.precatorioId === juridicoDeal.precatorioId)
      : undefined;
    if (orphan) {
      await core(
        `mutation($id: UUID!, $data: ${capitalize(ANALYSIS_OBJECT)}UpdateInput!) {
          update${capitalize(ANALYSIS_OBJECT)}(id: $id, data: $data) { id }
        }`,
        { id: orphan.id, data: { negociacaoId: juridicoDeal.id } },
      );
      orphan.negociacaoId = juridicoDeal.id;
      linked = orphan;
      console.log(`  ${juridicoDeal.name}: análise existente ligada ao negócio`);
    } else {
      const { [`create${capitalize(ANALYSIS_OBJECT)}`]: created } = await core(
        `mutation($data: ${capitalize(ANALYSIS_OBJECT)}CreateInput!) {
          create${capitalize(ANALYSIS_OBJECT)}(data: $data) { id status }
        }`,
        {
          data: {
            name: juridicoDeal.name,
            status: 'PENDENTE',
            negociacaoId: juridicoDeal.id,
            precatorioId: juridicoDeal.precatorioId,
          },
        },
      );
      linked = created;
      console.log(`  ${juridicoDeal.name}: análise jurídica aberta`);
    }
  }
  const decision = decisionOf(linked.status);
  if (juridicoDeal.decisaoJuridica !== decision) {
    await core(
      `mutation($id: UUID!, $data: ${capitalize(DEAL_OBJECT)}UpdateInput!) {
        update${capitalize(DEAL_OBJECT)}(id: $id, data: $data) { id }
      }`,
      { id: juridicoDeal.id, data: { decisaoJuridica: decision } },
    );
  }
}
console.log(`Negócios em Jurídico conferidos: ${dealsPage.edges.length}`);

console.log('Pronto. Recarregue a página (F5).');

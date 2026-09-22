// Ativa "campos obrigatórios por etapa" num workspace.
// Uso: TWENTY_API_KEY=<jwt> node criar-regras-etapa.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// O que faz:
//   1. Cria o objeto custom `regraEtapa` (uma regra = objeto + campo de etapa +
//      etapa + lista de campos obrigatórios). As regras em si são configuradas
//      pelo front, em Configurações → Regras de etapa.
//   2. Tira "Regras de etapa" do menu lateral (a lista crua só confunde; a tela
//      de configuração é o lugar de editar)
// Quem edita as regras: roles com permissão de Modelo de dados (Admin). As roles
// por setor só leem, então não conseguem afrouxar a regra.
// Exige a imagem com o módulo precatur-stage-rules (branch feat/precatur-chat).

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;

const OBJECT = {
  nameSingular: 'regraEtapa',
  namePlural: 'regrasEtapa',
  labelSingular: 'Regra de etapa',
  labelPlural: 'Regras de etapa',
  icon: 'IconListCheck',
  description:
    'Campos obrigatórios para avançar de etapa (Precatur). Editar em Configurações → Regras de etapa.',
};

const FIELDS = [
  ['objectNameSingular', 'Objeto (pipeline)', 'TEXT'],
  ['stageFieldName', 'Campo de etapa', 'TEXT'],
  ['stageValue', 'Etapa', 'TEXT'],
  ['requiredFieldNames', 'Campos obrigatórios', 'RAW_JSON'],
];

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
          fields(paging: { first: 500 }) { edges { node { name } } }
        } }
      }
    }`)
  ).objects.edges
    .map((edge) => edge.node)
    .find((node) => node.nameSingular === OBJECT.nameSingular);

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const log = { criados: [], pulados: [], falhos: [] };

let ruleObject = await loadObject();

if (!ruleObject) {
  try {
    await gql(
      `mutation($object: CreateObjectInput!) {
        createOneObject(input: { object: $object }) { id }
      }`,
      { object: OBJECT },
    );
    log.criados.push(`objeto ${OBJECT.nameSingular}`);
    ruleObject = await loadObject();
  } catch (error) {
    log.falhos.push(`objeto ${OBJECT.nameSingular}: ${error.message}`);
  }
} else {
  log.pulados.push(`objeto ${OBJECT.nameSingular} (já existe)`);
}

if (ruleObject) {
  const existingFieldNames = new Set(
    ruleObject.fields.edges.map((edge) => edge.node.name),
  );

  for (const [name, label, type] of FIELDS) {
    if (existingFieldNames.has(name)) {
      log.pulados.push(`${OBJECT.nameSingular}.${name} (já existe)`);
      continue;
    }
    try {
      await gql(
        `mutation($field: CreateFieldInput!) {
          createOneField(input: { field: $field }) { id }
        }`,
        {
          field: {
            objectMetadataId: ruleObject.id,
            name,
            label,
            type,
            isNullable: true,
          },
        },
      );
      log.criados.push(`${OBJECT.nameSingular}.${name} (${type})`);
    } catch (error) {
      log.falhos.push(`${OBJECT.nameSingular}.${name}: ${error.message}`);
    }
  }

  try {
    const { navigationMenuItems } = await gql(`query {
      navigationMenuItems { id type targetObjectMetadataId }
    }`);

    for (const item of navigationMenuItems) {
      if (item.type !== 'OBJECT' || item.targetObjectMetadataId !== ruleObject.id) {
        continue;
      }
      await gql(
        `mutation($id: UUID!) { deleteNavigationMenuItem(id: $id) { id } }`,
        { id: item.id },
      );
      log.criados.push(`removido do menu lateral: item ${item.id}`);
    }
  } catch (error) {
    log.falhos.push(`esconder do menu: ${error.message}`);
  }
}

console.log('\n════ RESUMO ════');
console.log(`Criados: ${log.criados.length}`);
log.criados.forEach((item) => console.log('  ✔ ' + item));
console.log(`Pulados: ${log.pulados.length}`);
log.pulados.forEach((item) => console.log('  ≈ ' + item));
console.log(`Falhos: ${log.falhos.length}`);
log.falhos.forEach((item) => console.log('  ✘ ' + item));
console.log(
  '\nPróximo passo: Configurações → Regras de etapa, escolher o pipeline e marcar os campos.',
);
process.exit(log.falhos.length ? 2 : 0);

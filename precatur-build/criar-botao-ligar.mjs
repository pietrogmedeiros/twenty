// Botão fixo "Ligar" na página do registro dos funis (Negociação e Filial
// Salvador). O botão do card no Kanban vem do front e não precisa de script.
// Uso: TWENTY_API_KEY=<jwt> node criar-botao-ligar.mjs [http://localhost:3000]
// Idempotente: pode rodar de novo sem duplicar nada.
//
// Exige a imagem com a chave PRECATUR_CALL (módulo precatur-call); antes do
// deploy a API recusa o engineComponentKey. A ligação ainda é simulada: o
// provedor (Calling API oficial ou VoIP) é trocado em PrecaturCallProvider.ts.

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;

const ENGINE_COMPONENT_KEY = 'PRECATUR_CALL';

const COMMAND = {
  engineComponentKey: ENGINE_COMPONENT_KEY,
  label: 'Ligar',
  shortLabel: 'Ligar',
  icon: 'IconPhone',
  isPinned: true,
  position: 68,
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression:
    'pageType == "RECORD_PAGE" and not isInSidePanel and numberOfSelectedRecords == 1 and (objectMetadataItem.nameSingular == "negociacao" or objectMetadataItem.nameSingular == "oportunidadeSalvador")',
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

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const { commandMenuItems } = await gql(
  `query { commandMenuItems { id label engineComponentKey } }`,
);

const existing = commandMenuItems.find(
  (item) => item.engineComponentKey === ENGINE_COMPONENT_KEY,
);

if (existing) {
  console.log('Botão Ligar já existe');
} else {
  await gql(
    `mutation($input: CreateCommandMenuItemInput!) {
      createCommandMenuItem(input: $input) { id }
    }`,
    { input: COMMAND },
  );
  console.log('Botão Ligar criado na página do registro');
}

console.log('Pronto. Recarregue a página (F5).');

// Provisiona o chat interno por registro (estilo bate-papo do Bitrix) num workspace.
// Uso: TWENTY_API_KEY=<jwt> node criar-chat.mjs [http://localhost:3000] [objeto1,objeto2,...]
//   - objetos padrão: negociacao,precatorio,analiseJuridica,processoAdministrativo,pagamento,
//     oportunidadeSalvador (Filial Salvador)
//     (os que não existirem no workspace são pulados)
// Idempotente: pode rodar de novo sem duplicar objetos, campos, permissões ou abas.
//
// O que faz:
//   1. Cria os objetos custom `mensagemChat` (mensagens) e `leituraChat` (quem leu até quando)
//   2. Libera leitura/escrita nesses dois objetos para todas as roles que não editam tudo
//      (as roles por setor só editam o próprio objeto; sem isso ninguém consegue mandar mensagem)
//      e soma as flags UPLOAD_FILE/DOWNLOAD_FILE (sem elas não dá para anexar arquivo)
//   2b. Tira "Mensagens de chat"/"Leituras de chat" do menu lateral
//   3. Adiciona a aba "Chat" (widget CHAT, tela cheia) na página de registro dos objetos alvo
// Exige a imagem com o tipo de widget CHAT (branch feat/precatur-chat).

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/metadata`;
const API_KEY = process.env.TWENTY_API_KEY;
const TARGET_OBJECTS = (
  process.argv[3] ??
  'negociacao,precatorio,analiseJuridica,processoAdministrativo,pagamento,oportunidadeSalvador'
)
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const CHAT_TAB_TITLE = 'Chat';
const FILE_PERMISSION_FLAGS = ['UPLOAD_FILE', 'DOWNLOAD_FILE'];

const OBJECTS = [
  {
    object: {
      nameSingular: 'mensagemChat',
      namePlural: 'mensagensChat',
      labelSingular: 'Mensagem de chat',
      labelPlural: 'Mensagens de chat',
      icon: 'IconMessageCircle',
      description: 'Mensagens do chat interno por registro (Precatur).',
    },
    fields: [
      ['body', 'Mensagem', 'TEXT'],
      ['targetObjectNameSingular', 'Objeto do registro', 'TEXT'],
      ['targetRecordId', 'ID do registro', 'UUID'],
      ['targetRecordLabel', 'Registro', 'TEXT'],
      ['mentionedWorkspaceMemberIds', 'Mencionados', 'RAW_JSON'],
      ['attachmentIds', 'Anexos', 'RAW_JSON'],
    ],
  },
  {
    object: {
      nameSingular: 'leituraChat',
      namePlural: 'leiturasChat',
      labelSingular: 'Leitura de chat',
      labelPlural: 'Leituras de chat',
      icon: 'IconChecks',
      description: 'Até quando cada membro leu o chat de cada registro (Precatur).',
    },
    fields: [
      ['workspaceMemberId', 'Membro', 'UUID'],
      ['targetObjectNameSingular', 'Objeto do registro', 'TEXT'],
      ['targetRecordId', 'ID do registro', 'UUID'],
      ['lastReadAt', 'Lido até', 'DATE_TIME'],
    ],
  },
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

const OBJECTS_QUERY = `query {
  objects(paging: { first: 200 }) {
    edges { node {
      id
      nameSingular
      fields(paging: { first: 500 }) { edges { node { name } } }
    } }
  }
}`;

const loadObjects = async () =>
  (await gql(OBJECTS_QUERY)).objects.edges.map((edge) => ({
    id: edge.node.id,
    nameSingular: edge.node.nameSingular,
    fieldNames: new Set(edge.node.fields.edges.map((field) => field.node.name)),
  }));

if (!API_KEY) {
  console.error('Defina TWENTY_API_KEY');
  process.exit(1);
}

const log = { criados: [], pulados: [], falhos: [] };

// ─── 1. Objetos e campos ────────────────────────────────────────────────────
let objects = await loadObjects();

for (const spec of OBJECTS) {
  let existing = objects.find((o) => o.nameSingular === spec.object.nameSingular);

  if (!existing) {
    try {
      await gql(
        `mutation($object: CreateObjectInput!) {
          createOneObject(input: { object: $object }) { id nameSingular }
        }`,
        { object: spec.object },
      );
      log.criados.push(`objeto ${spec.object.nameSingular}`);
      objects = await loadObjects();
      existing = objects.find((o) => o.nameSingular === spec.object.nameSingular);
    } catch (error) {
      log.falhos.push(`objeto ${spec.object.nameSingular}: ${error.message}`);
      continue;
    }
  } else {
    log.pulados.push(`objeto ${spec.object.nameSingular} (já existe)`);
  }

  for (const [name, label, type] of spec.fields) {
    if (existing.fieldNames.has(name)) {
      log.pulados.push(`${spec.object.nameSingular}.${name} (já existe)`);
      continue;
    }
    try {
      await gql(
        `mutation($field: CreateFieldInput!) {
          createOneField(input: { field: $field }) { id name }
        }`,
        {
          field: {
            objectMetadataId: existing.id,
            name,
            label,
            type,
            isNullable: true,
          },
        },
      );
      existing.fieldNames.add(name);
      log.criados.push(`${spec.object.nameSingular}.${name} (${type})`);
    } catch (error) {
      log.falhos.push(`${spec.object.nameSingular}.${name}: ${error.message}`);
    }
  }
}

// ─── 2. Permissões: roles por setor precisam escrever no chat ──────────────
const chatObjectIds = OBJECTS.map(
  (spec) => objects.find((o) => o.nameSingular === spec.object.nameSingular)?.id,
).filter(Boolean);

try {
  const { getRoles } = await gql(`query {
    getRoles {
      id label canUpdateAllObjectRecords canReadAllObjectRecords canUpdateAllSettings
      permissionFlags { flag }
    }
  }`);

  for (const role of getRoles) {
    if (role.canUpdateAllObjectRecords) {
      log.pulados.push(`role ${role.label} (já edita tudo)`);
      continue;
    }
    try {
      await gql(
        `mutation($input: UpsertObjectPermissionsInput!) {
          upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId }
        }`,
        {
          input: {
            roleId: role.id,
            objectPermissions: chatObjectIds.map((objectMetadataId) => ({
              objectMetadataId,
              canReadObjectRecords: true,
              canUpdateObjectRecords: true,
              canSoftDeleteObjectRecords: true,
              canDestroyObjectRecords: false,
            })),
          },
        },
      );
      log.criados.push(`permissão de chat na role ${role.label}`);
    } catch (error) {
      log.falhos.push(`permissão na role ${role.label}: ${error.message}`);
    }

    // Anexar arquivo no chat (e na aba Arquivos) exige as flags de upload/download.
    // O upsert substitui a lista inteira, então soma às flags que a role já tem.
    if (role.canUpdateAllSettings) {
      continue;
    }
    const currentFlags = (role.permissionFlags ?? []).map((item) => item.flag);
    const missingFlags = FILE_PERMISSION_FLAGS.filter(
      (flag) => !currentFlags.includes(flag),
    );
    if (missingFlags.length === 0) {
      log.pulados.push(`arquivos na role ${role.label} (já tem upload/download)`);
      continue;
    }
    try {
      await gql(
        `mutation($input: UpsertPermissionFlagsInput!) {
          upsertPermissionFlags(upsertPermissionFlagsInput: $input) { flag }
        }`,
        {
          input: {
            roleId: role.id,
            permissionFlagKeys: [...currentFlags, ...missingFlags],
          },
        },
      );
      log.criados.push(`upload/download de arquivos na role ${role.label}`);
    } catch (error) {
      log.falhos.push(`arquivos na role ${role.label}: ${error.message}`);
    }
  }
} catch (error) {
  log.falhos.push(`listar roles: ${error.message}`);
}

// ─── 2b. Tirar os objetos técnicos do menu lateral ─────────────────────────
// Mensagens e leituras são lidas pela aba Chat e pela caixa "Bate-papos";
// como lista crua na barra lateral só confundem.
try {
  const { navigationMenuItems } = await gql(`query {
    navigationMenuItems { id type targetObjectMetadataId }
  }`);

  for (const item of navigationMenuItems) {
    if (item.type !== 'OBJECT' || !chatObjectIds.includes(item.targetObjectMetadataId)) {
      continue;
    }
    await gql(
      `mutation($id: UUID!) { deleteNavigationMenuItem(id: $id) { id } }`,
      { id: item.id },
    );
    log.criados.push(`removido do menu lateral: item ${item.id}`);
  }
} catch (error) {
  log.falhos.push(`esconder objetos do menu: ${error.message}`);
}

// ─── 3. Aba "Chat" na página de registro ───────────────────────────────────
for (const objectName of TARGET_OBJECTS) {
  const target = objects.find((o) => o.nameSingular === objectName);
  if (!target) {
    log.pulados.push(`aba Chat em ${objectName} (objeto não existe neste workspace)`);
    continue;
  }

  try {
    const { getPageLayouts } = await gql(
      `query($objectMetadataId: String) {
        getPageLayouts(objectMetadataId: $objectMetadataId, pageLayoutType: RECORD_PAGE) {
          id
          tabs { id title position widgets { id type } }
        }
      }`,
      { objectMetadataId: target.id },
    );

    const pageLayout = getPageLayouts[0];
    if (!pageLayout) {
      log.falhos.push(`aba Chat em ${objectName}: objeto sem layout de página`);
      continue;
    }

    const alreadyHasChat = pageLayout.tabs.some((tab) =>
      tab.widgets.some((widget) => widget.type === 'CHAT'),
    );
    if (alreadyHasChat) {
      log.pulados.push(`aba Chat em ${objectName} (já existe)`);
      continue;
    }

    // Reaproveita uma aba "Chat" vazia (ex.: sobra de uma rodada em que o
    // widget falhou) em vez de criar outra
    const emptyChatTab = pageLayout.tabs.find(
      (tab) => tab.title === CHAT_TAB_TITLE && tab.widgets.length === 0,
    );

    let chatTabId = emptyChatTab?.id;

    if (!chatTabId) {
      // Logo depois da primeira aba (normalmente "Home"), como no Bitrix
      const positions = pageLayout.tabs
        .map((tab) => tab.position)
        .sort((a, b) => a - b);
      const position =
        positions.length > 1 ? (positions[0] + positions[1]) / 2 : (positions[0] ?? 0) + 1;

      const { createPageLayoutTab } = await gql(
        `mutation($input: CreatePageLayoutTabInput!) {
          createPageLayoutTab(input: $input) { id }
        }`,
        {
          input: {
            title: CHAT_TAB_TITLE,
            pageLayoutId: pageLayout.id,
            position,
            layoutMode: 'VERTICAL_LIST',
          },
        },
      );
      chatTabId = createPageLayoutTab.id;
    }

    await gql(
      `mutation($input: CreatePageLayoutWidgetInput!) {
        createPageLayoutWidget(input: $input) { id }
      }`,
      {
        input: {
          pageLayoutTabId: chatTabId,
          title: CHAT_TAB_TITLE,
          type: 'CHAT',
          gridPosition: { row: 0, column: 0, rowSpan: 12, columnSpan: 12 },
          position: { layoutMode: 'VERTICAL_LIST', index: 0 },
          configuration: { configurationType: 'CHAT' },
        },
      },
    );
    log.criados.push(`aba Chat em ${objectName}`);
  } catch (error) {
    log.falhos.push(`aba Chat em ${objectName}: ${error.message}`);
  }
}

console.log('\n════ RESUMO ════');
console.log(`Criados: ${log.criados.length}`);
log.criados.forEach((item) => console.log('  ✔ ' + item));
console.log(`Pulados: ${log.pulados.length}`);
log.pulados.forEach((item) => console.log('  ≈ ' + item));
console.log(`Falhos: ${log.falhos.length}`);
log.falhos.forEach((item) => console.log('  ✘ ' + item));
process.exit(log.falhos.length ? 2 : 0);

// Workflow Direito creditório + cobrança diária de documentos (jurídico, nov/2026)
// Uso: TWENTY_API_KEY=<jwt> node criar-direito-creditorio.mjs [http://localhost:3000] [--aplicar]
// Sem --aplicar só mostra o que faria. Idempotente. Rodar depois de
// criar-juridico.mjs e criar-pasta-documentos.mjs; depois:
//   node criar-chat.mjs <url>            (bate-papo no Direito creditório)
//   node corrigir-colunas-kanban.mjs <url> --aplicar   (coluna nova na Análise)
//
//   1. Etapa "Direito creditório" no Status da Análise Jurídica (logo depois da
//      Pré Análise). Mover a análise para lá faz o servidor abrir o card do
//      Direito creditório (módulo precatur-direito-creditorio).
//   2. Objeto Direito creditório: Aguardando expedição de ofício → Aguardando
//      envio ao tribunal → Virou precatório. Virou precatório exige o valor
//      atualizado; o servidor grava o valor no Precatório, aprova a análise
//      (destrava o negócio) e avisa o responsável comercial no bate-papo.
//   3. Kanban, menu (abaixo do Pós-Compra) e role do Jurídico editando.
//   4. Campos da cobrança de documentos na Análise Jurídica (preenchidos pelo
//      servidor — módulo precatur-document-reminders).
//   5. Objeto Configurações Precatur (fora do menu): guarda o gestor comercial
//      avisado no fim da cobrança, escolhido em Configurações → Regras de etapa.

const BASE_URL = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const APPLY = process.argv.includes('--aplicar');
const API_KEY = process.env.TWENTY_API_KEY;

const option = ([value, label, color], position) => ({ value, label, color, position });

const ANALISE_STAGE = { value: 'DIREITO_CREDITORIO', label: 'Direito creditório', color: 'purple' };
const ANALISE_STAGE_AFTER = 'PRE_ANALISE_AUTOMATICA';

const OBJECT = {
  nameSingular: 'direitoCreditorio',
  namePlural: 'direitosCreditorios',
  labelSingular: 'Direito creditório',
  labelPlural: 'Direitos creditórios',
  icon: 'IconFileCertificate',
  description:
    'Crédito ainda sem precatório: acompanha a expedição do ofício e o envio ao tribunal até virar precatório (Precatur)',
};

const FIELDS = [
  {
    type: 'SELECT',
    name: 'etapa',
    label: 'Etapa',
    icon: 'IconProgress',
    defaultValue: "'AGUARDANDO_EXPEDICAO_OFICIO'",
    options: [
      ['AGUARDANDO_EXPEDICAO_OFICIO', 'Aguardando expedição de ofício', 'yellow'],
      ['AGUARDANDO_ENVIO_TRIBUNAL', 'Aguardando envio ao tribunal', 'orange'],
      ['VIROU_PRECATORIO', 'Virou precatório', 'green'],
    ].map(option),
  },
  { type: 'TEXT', name: 'numeroOficio', label: 'Nº do ofício', icon: 'IconHash' },
  { type: 'DATE', name: 'dataExpedicaoOficio', label: 'Ofício expedido em', icon: 'IconCalendar' },
  { type: 'DATE', name: 'dataEnvioTribunal', label: 'Enviado ao tribunal em', icon: 'IconSend' },
  {
    type: 'CURRENCY',
    name: 'valorAtualizado',
    label: 'Valor atualizado',
    icon: 'IconCurrencyReal',
    description: 'Obrigatório para "Virou precatório"; vai para o Valor atualizado do Precatório',
  },
  {
    type: 'DATE_TIME',
    name: 'entrouNaEtapaEm',
    label: 'Entrou na etapa em',
    icon: 'IconClockHour4',
    description: 'Preenchido pelo sistema quando a etapa muda',
  },
];

// [nome, rótulo, ícone, objeto alvo, rótulo do lado de lá]
const RELATIONS = [
  ['analiseJuridica', 'Análise Jurídica', 'IconGavel', 'analiseJuridica', 'Direitos creditórios'],
  ['negociacao', 'Negociação', 'IconBriefcase', 'negociacao', 'Direitos creditórios'],
  ['precatorio', 'Precatório', 'IconFileText', 'precatorio', 'Direitos creditórios'],
  ['responsavelJuridico', 'Responsável jurídico', 'IconUserCircle', 'workspaceMember', 'Direitos creditórios'],
];

const KANBAN = {
  name: 'Direito creditório por etapa',
  cardFields: ['name', 'negociacao', 'precatorio', 'responsavelJuridico', 'numeroOficio', 'valorAtualizado', 'entrouNaEtapaEm'],
};

const STAGE_RULE = {
  name: 'Direito creditório → Virou precatório',
  objectNameSingular: OBJECT.nameSingular,
  stageFieldName: 'etapa',
  stageValue: 'VIROU_PRECATORIO',
  requiredFieldNames: ['valorAtualizado'],
};

const REMINDER_FIELDS = [
  {
    type: 'SELECT',
    name: 'cobrancaDocumentos',
    label: 'Cobrança de documentos',
    icon: 'IconBellRinging',
    description:
      'Preenchido pelo sistema: cobra o responsável comercial no bate-papo do negócio por 5 dias úteis enquanto faltar documento da Due',
    options: [
      ['COBRANDO', 'Cobrando', 'yellow'],
      ['RESOLVIDA', 'Documentos recebidos', 'green'],
      ['ESCALADA', 'Avisado o gestor comercial', 'red'],
      ['ENCERRADA', 'Encerrada (saiu da pré-análise)', 'gray'],
    ].map(option),
  },
  { type: 'NUMBER', name: 'cobrancaDocumentosEnviadas', label: 'Cobranças enviadas', icon: 'IconBell' },
  { type: 'DATE', name: 'cobrancaDocumentosUltimaEm', label: 'Última cobrança em', icon: 'IconCalendar' },
];

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

let objects = [];
const loadObjects = async () => {
  objects = (
    await metadata(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular namePlural
          fields(paging: { first: 500 }) { edges { node { id name type options } } }
        } }
      }
    }`)
  ).objects.edges.map((edge) => edge.node);
};
const objectByName = (name) => objects.find((object) => object.nameSingular === name);
const fieldOf = (object, name) => object?.fields.edges.find((edge) => edge.node.name === name)?.node;

const ensureFields = async (object, fields) => {
  for (const field of fields) {
    if (fieldOf(object, field.name)) {
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
};

await loadObjects();
for (const name of ['negociacao', 'analiseJuridica', 'precatorio']) {
  if (!objectByName(name)) {
    console.error(`Objeto ${name} não existe neste workspace`);
    process.exit(1);
  }
}

// 1. Etapa "Direito creditório" na Análise Jurídica
console.log('1. Etapa na Análise Jurídica');
const analise = objectByName('analiseJuridica');
const statusField = fieldOf(analise, 'status');
const statusOptions = [...(statusField.options ?? [])].sort((a, b) => a.position - b.position);
if (statusOptions.some((item) => item.value === ANALISE_STAGE.value)) {
  console.log('  já existe');
} else {
  const afterIndex = statusOptions.findIndex((item) => item.value === ANALISE_STAGE_AFTER);
  const withNew = [...statusOptions];
  withNew.splice(afterIndex + 1, 0, ANALISE_STAGE);
  const options = withNew.map(({ id, value, label, color }, position) => ({
    ...(id ? { id } : {}),
    value,
    label,
    color,
    position,
  }));
  await run(`etapas: ${options.map((item) => item.label).join(' → ')}`, () =>
    metadata(
      `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
      { input: { id: statusField.id, update: { options } } },
    ),
  );
}

// 2. Objeto Direito creditório
console.log('2. Objeto Direito creditório');
if (objectByName(OBJECT.nameSingular)) {
  console.log('  objeto já existe');
} else {
  await run('criar objeto', () =>
    metadata(`mutation($input: CreateOneObjectInput!) { createOneObject(input: $input) { id } }`, {
      input: { object: OBJECT },
    }),
  );
  if (APPLY) await loadObjects();
}
let direito = objectByName(OBJECT.nameSingular);
if (direito) {
  await ensureFields(direito, FIELDS);
  for (const [name, label, icon, target, targetFieldLabel] of RELATIONS) {
    if (fieldOf(direito, name)) {
      console.log(`  relação ${label} já existe`);
      continue;
    }
    await run(`criar relação ${label}`, () =>
      metadata(`mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`, {
        input: {
          field: {
            objectMetadataId: direito.id,
            type: 'RELATION',
            name,
            label,
            icon,
            relationCreationPayload: {
              type: 'MANY_TO_ONE',
              targetObjectMetadataId: objectByName(target).id,
              targetFieldLabel,
              targetFieldIcon: OBJECT.icon,
            },
          },
        },
      }),
    );
  }
} else {
  console.log('  campos e relações entram depois de criar o objeto (rode com --aplicar)');
}

// 4. Campos da cobrança de documentos (Análise Jurídica)
console.log('4. Cobrança de documentos (Análise Jurídica)');
await ensureFields(analise, REMINDER_FIELDS);

if (APPLY) await loadObjects();
direito = objectByName(OBJECT.nameSingular);

// 3. Kanban, menu, role e regra de etapa
console.log('3. Kanban, menu, permissões e regra');
if (!direito) {
  console.log('  entra depois de criar o objeto (rode com --aplicar)');
} else {
  const { getViews } = await metadata(`query($id: String) { getViews(objectMetadataId: $id) { id name } }`, {
    id: direito.id,
  });
  if (getViews.some((view) => view.name === KANBAN.name)) {
    console.log(`  view ${KANBAN.name} já existe`);
  } else {
    await run(`criar view ${KANBAN.name}`, async () => {
      const { createView } = await metadata(
        `mutation($input: CreateViewInput!) { createView(input: $input) { id } }`,
        {
          input: {
            name: KANBAN.name,
            icon: 'IconLayoutKanban',
            objectMetadataId: direito.id,
            type: 'KANBAN',
            mainGroupByFieldMetadataId: fieldOf(direito, 'etapa').id,
            visibility: 'WORKSPACE',
            position: 1,
          },
        },
      );
      await metadata(`mutation($inputs: [CreateViewFieldInput!]!) { createManyViewFields(inputs: $inputs) { id } }`, {
        inputs: KANBAN.cardFields
          .map((name) => fieldOf(direito, name)?.id)
          .filter(Boolean)
          .map((fieldMetadataId, position) => ({ viewId: createView.id, fieldMetadataId, isVisible: true, position })),
      });
    });
  }

  // Menu: logo abaixo do Pós-Compra (ou da Análise Jurídica)
  const { navigationMenuItems } = await metadata(
    `query { navigationMenuItems { id position targetObjectMetadataId userWorkspaceId folderId } }`,
  );
  const sideMenu = navigationMenuItems.filter((item) => !item.userWorkspaceId && !item.folderId);
  const anchorObject = objectByName('acompanhamentoPosCompra') ?? analise;
  const anchorItem = sideMenu.find((item) => item.targetObjectMetadataId === anchorObject.id);
  const direitoItem = sideMenu.find((item) => item.targetObjectMetadataId === direito.id);
  if (anchorItem && direitoItem) {
    const nextPosition = Math.min(
      ...sideMenu
        .filter((item) => item.position > anchorItem.position && item.id !== direitoItem.id)
        .map((item) => item.position),
      anchorItem.position + 1,
    );
    if (direitoItem.position > anchorItem.position && direitoItem.position < nextPosition) {
      console.log('  menu já no lugar');
    } else {
      await run('menu: Direito creditório logo abaixo do Pós-Compra', () =>
        metadata(
          `mutation($input: UpdateOneNavigationMenuItemInput!) { updateNavigationMenuItem(input: $input) { id } }`,
          { input: { id: direitoItem.id, update: { position: (anchorItem.position + nextPosition) / 2 } } },
        ),
      );
    }
  } else {
    console.log('  menu: item do Direito creditório ainda não apareceu (recarregue e rode de novo)');
  }

  // Role do Jurídico edita o Direito creditório
  const { getRoles } = await metadata(`query {
    getRoles {
      id label canUpdateAllObjectRecords
      objectPermissions {
        objectMetadataId canReadObjectRecords canUpdateObjectRecords
        canSoftDeleteObjectRecords canDestroyObjectRecords
      }
    }
  }`);
  for (const role of getRoles.filter((item) => /jur[ií]dico/i.test(item.label))) {
    if (role.canUpdateAllObjectRecords) continue;
    if (role.objectPermissions.some((p) => p.objectMetadataId === direito.id && p.canUpdateObjectRecords)) {
      console.log(`  role ${role.label} já edita`);
      continue;
    }
    // upsertObjectPermissions SUBSTITUI a lista inteira da role: reenvia as atuais
    const kept = role.objectPermissions
      .filter((p) => p.objectMetadataId !== direito.id)
      .map(({ objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords, canDestroyObjectRecords }) => ({
        objectMetadataId,
        canReadObjectRecords,
        canUpdateObjectRecords,
        canSoftDeleteObjectRecords,
        canDestroyObjectRecords,
      }));
    await run(`role ${role.label} edita o Direito creditório`, () =>
      metadata(
        `mutation($input: UpsertObjectPermissionsInput!) { upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId } }`,
        {
          input: {
            roleId: role.id,
            objectPermissions: [
              ...kept,
              {
                objectMetadataId: direito.id,
                canReadObjectRecords: true,
                canUpdateObjectRecords: true,
                canSoftDeleteObjectRecords: true,
                canDestroyObjectRecords: false,
              },
            ],
          },
        },
      ),
    );
  }

  // Regra: Virou precatório exige o valor atualizado
  if (!objectByName('regraEtapa')) {
    console.log('  regras de etapa não ativadas (rode criar-regras-etapa.mjs)');
  } else {
    const { regrasEtapa } = await core(
      `query($filter: RegraEtapaFilterInput) { regrasEtapa(filter: $filter) { edges { node { id requiredFieldNames } } } }`,
      {
        filter: {
          objectNameSingular: { eq: STAGE_RULE.objectNameSingular },
          stageFieldName: { eq: STAGE_RULE.stageFieldName },
          stageValue: { eq: STAGE_RULE.stageValue },
        },
      },
    );
    const existing = regrasEtapa.edges[0]?.node;
    const current = Array.isArray(existing?.requiredFieldNames) ? existing.requiredFieldNames : [];
    if (existing && STAGE_RULE.requiredFieldNames.every((name) => current.includes(name))) {
      console.log('  regra Virou precatório já exige o valor');
    } else if (existing) {
      await run('regra Virou precatório: somar valor atualizado', () =>
        core(`mutation($id: UUID!, $data: RegraEtapaUpdateInput!) { updateRegraEtapa(id: $id, data: $data) { id } }`, {
          id: existing.id,
          data: { requiredFieldNames: [...new Set([...current, ...STAGE_RULE.requiredFieldNames])] },
        }),
      );
    } else {
      await run('regra Virou precatório exige valor atualizado', () =>
        core(`mutation($data: RegraEtapaCreateInput!) { createRegraEtapa(data: $data) { id } }`, { data: STAGE_RULE }),
      );
    }
  }
}

// 5. Configurações do workspace (gestor da cobrança, escolhido em
//    Configurações → Regras de etapa). Objeto técnico: fica fora do menu.
console.log('5. Configurações Precatur');
const SETTINGS_OBJECT = {
  nameSingular: 'configuracaoPrecatur',
  namePlural: 'configuracoesPrecatur',
  labelSingular: 'Configuração Precatur',
  labelPlural: 'Configurações Precatur',
  icon: 'IconSettings',
  description: 'Configurações das automações Precatur (editadas em Configurações → Regras de etapa)',
};
const SETTINGS_FIELDS = [
  { type: 'TEXT', name: 'chave', label: 'Chave', icon: 'IconKey' },
  { type: 'RAW_JSON', name: 'valor', label: 'Valor', icon: 'IconBraces' },
];
if (objectByName(SETTINGS_OBJECT.nameSingular)) {
  console.log('  objeto já existe');
} else {
  await run('criar objeto de configurações', () =>
    metadata(`mutation($input: CreateOneObjectInput!) { createOneObject(input: $input) { id } }`, {
      input: { object: SETTINGS_OBJECT },
    }),
  );
  if (APPLY) await loadObjects();
}
const settingsObject = objectByName(SETTINGS_OBJECT.nameSingular);
if (settingsObject) {
  await ensureFields(settingsObject, SETTINGS_FIELDS);
  const { navigationMenuItems: menuItems } = await metadata(
    `query { navigationMenuItems { id targetObjectMetadataId } }`,
  );
  for (const item of menuItems.filter((menuItem) => menuItem.targetObjectMetadataId === settingsObject.id)) {
    await run('tirar Configurações Precatur do menu', () =>
      metadata(`mutation($id: UUID!) { deleteNavigationMenuItem(id: $id) { id } }`, { id: item.id }),
    );
  }
}

console.log(APPLY ? 'Pronto. Recarregue a página (F5).' : 'Simulação. Rode de novo com --aplicar.');

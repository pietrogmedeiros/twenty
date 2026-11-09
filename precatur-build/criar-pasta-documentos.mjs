// Pasta de documentos do processo (retorno do jurídico, nov/2026 — opção B)
// Uso: TWENTY_API_KEY=<jwt> node criar-pasta-documentos.mjs [http://localhost:3000] [--aplicar]
// Sem --aplicar só mostra o que faria. Idempotente. Rodar depois do deploy
// que traz o módulo precatur-documents (servidor) e a aba Arquivos nova (front).
//
//   1. Campo "Tipo do documento" (tipoDocumento, SELECT) no objeto Anexo —
//      escolhido na hora do upload e usado pelas regras de etapa.
//   2. Anexos já existentes em cards com precatório vão para a pasta do
//      precatório (o servidor só move sozinho quando o precatório é ligado).
//   3. Oculta (desativa, sem apagar dados) os 16 campos de anexo em texto da
//      Análise Jurídica e o link "Pasta do processo", e tira esses campos das
//      regras de etapa (campo oculto não pode ser obrigatório).
//   4. Regras de documento na Análise Jurídica (ajustáveis na tela):
//      Due → Processo de precatório + Documento pessoal;
//      Análise Definitiva → Espelho fiscal se houver certidão positiva.

const BASE_URL = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const APPLY = process.argv.includes('--aplicar');
const API_KEY = process.env.TWENTY_API_KEY;

const DOCUMENT_TYPE_FIELD = {
  type: 'SELECT',
  name: 'tipoDocumento',
  label: 'Tipo do documento',
  icon: 'IconFileDescription',
  description: 'Tipo do documento na pasta do processo; as regras de etapa conferem os tipos presentes (Precatur)',
  options: [
    ['PROCESSO_PRECATORIO', 'Processo de precatório', 'blue'],
    ['DOCUMENTO_PESSOAL', 'Documento pessoal (RG/CNH/CPF)', 'sky'],
    ['COMPROVANTE_RESIDENCIA', 'Comprovante de residência', 'sky'],
    ['CERTIDAO_CIVIL', 'Certidão de casamento/nascimento', 'sky'],
    ['CERTIDAO', 'Certidão (fiscal/judicial)', 'turquoise'],
    ['ESPELHO_FISCAL', 'Espelho fiscal', 'red'],
    ['OFICIO_REQUISITORIO', 'Ofício requisitório', 'purple'],
    ['SENTENCA_ACORDAO', 'Sentença / acórdão', 'purple'],
    ['DECISAO_HOMOLOGACAO', 'Decisão de homologação', 'purple'],
    ['CALCULO', 'Cálculo', 'orange'],
    ['CONTRATO_HONORARIOS', 'Contrato de honorários', 'yellow'],
    ['CONTRATO_CESSAO', 'Contrato / escritura de cessão', 'yellow'],
    ['PETICAO', 'Petição', 'pink'],
    ['COMPROVANTE_PAGAMENTO', 'Comprovante de pagamento', 'green'],
    ['OUTRO', 'Outro', 'gray'],
  ].map(([value, label, color], position) => ({ value, label, color, position })),
};

// Campos de anexo em texto da Análise Jurídica (criar-campos-pipelines.mjs)
// + o link da pasta (criar-juridico.mjs), substituídos pela aba Arquivos
const HIDDEN_ANALISE_FIELDS = [
  'anexoCalculoAtualizado',
  'anexoCalculosHomologados',
  'anexoCalculosPreAnalise',
  'anexoOficio',
  'anexoPrecatorio',
  'anexoProcesso',
  'anexoSentencaAcordao',
  'certidoesNegativasEstaduais',
  'certidoesNegativasJusticaEstadual1Grau',
  'certidoesNegativasJusticaEstadual2Grau',
  'certidoesNegativasJusticaFederalUnificada',
  'certidoesNegativasMunicipais',
  'certidoesNegativasTrabalhistas',
  'certidoesNegativasUniao',
  'contratoHonorarios',
  'decisaoHomologatoria',
  'pastaProcesso',
];

const DOCUMENT_RULES = [
  {
    stageValue: 'DUE',
    name: 'Análise Jurídica → Due (documentos)',
    items: ['documento:PROCESSO_PRECATORIO', 'documento:DOCUMENTO_PESSOAL'],
  },
  {
    stageValue: 'ANALISE_DEFINITIVA',
    name: 'Análise Jurídica → Análise Definitiva (documentos)',
    items: ['documento:ESPELHO_FISCAL_SE_CERTIDAO_POSITIVA'],
  },
];

// Objetos cujos cards mostram a pasta do precatório
const FOLDER_OBJECTS = ['negociacao', 'analiseJuridica', 'acompanhamentoPosCompra', 'direitoCreditorio', 'pagamento', 'processoAdministrativo'];

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

const loadObjects = async () =>
  (
    await metadata(`query {
      objects(paging: { first: 200 }) {
        edges { node {
          id nameSingular namePlural
          fields(paging: { first: 500 }) { edges { node { id name label type isActive } } }
        } }
      }
    }`)
  ).objects.edges.map((edge) => edge.node);

let objects = await loadObjects();
const objectByName = (name) => objects.find((object) => object.nameSingular === name);
const fieldOf = (object, name) => object?.fields.edges.find((edge) => edge.node.name === name)?.node;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

for (const name of ['attachment', 'precatorio', 'analiseJuridica']) {
  if (!objectByName(name)) {
    console.error(`Objeto ${name} não existe neste workspace`);
    process.exit(1);
  }
}

// 1. Tipo do documento no anexo
console.log('1. Tipo do documento (Anexo)');
const attachment = objectByName('attachment');
if (!fieldOf(attachment, 'targetPrecatorio')) {
  console.error('  O anexo não tem relação com Precatório — a pasta por precatório não funciona aqui');
  process.exit(1);
}
if (fieldOf(attachment, DOCUMENT_TYPE_FIELD.name)) {
  console.log('  já existe');
} else {
  await run('criar campo tipoDocumento', () =>
    metadata(
      `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id } }`,
      { input: { field: { ...DOCUMENT_TYPE_FIELD, objectMetadataId: attachment.id } } },
    ),
  );
}

// 2. Anexos antigos dos cards → pasta do precatório
console.log('2. Anexos existentes → pasta do precatório');
for (const objectName of FOLDER_OBJECTS) {
  const object = objectByName(objectName);
  if (!object || !fieldOf(object, 'precatorio') || !fieldOf(attachment, `target${capitalize(objectName)}`)) {
    continue;
  }
  const targetIdName = `target${capitalize(objectName)}Id`;
  const targetName = `target${capitalize(objectName)}`;
  let after = null;
  let moved = 0;
  let withoutFolder = 0;
  do {
    const { attachments } = await core(
      `query($after: String) {
        attachments(first: 100, after: $after, filter: { ${targetIdName}: { is: NOT_NULL } }) {
          pageInfo { hasNextPage endCursor }
          edges { node { id name ${targetName} { id precatorioId } } }
        }
      }`,
      { after },
    );
    for (const { node } of attachments.edges) {
      const folderId = node[targetName]?.precatorioId;
      if (!folderId) {
        withoutFolder += 1;
        continue;
      }
      moved += 1;
      await run(`${objectName}: "${node.name}" → precatório ${folderId}`, () =>
        core(
          `mutation($id: UUID!, $data: AttachmentUpdateInput!) { updateAttachment(id: $id, data: $data) { id } }`,
          { id: node.id, data: { targetPrecatorioId: folderId, [targetIdName]: null } },
        ),
      );
    }
    after = attachments.pageInfo.hasNextPage ? attachments.pageInfo.endCursor : null;
  } while (after);
  console.log(`  ${objectName}: ${moved} para mover, ${withoutFolder} ficam no card (sem precatório)`);
}

// 3. Ocultar campos de anexo em texto da Análise Jurídica
console.log('3. Campos de anexo em texto da Análise Jurídica (ocultar, dados preservados)');
const analise = objectByName('analiseJuridica');
const hiddenFieldNames = [];
for (const name of HIDDEN_ANALISE_FIELDS) {
  const field = fieldOf(analise, name);
  if (!field) {
    console.log(`  ${name} não existe — ignorado`);
    continue;
  }
  hiddenFieldNames.push(name);
  if (!field.isActive) {
    console.log(`  ${field.label} já oculto`);
    continue;
  }
  await run(`ocultar "${field.label}"`, () =>
    metadata(
      `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
      { input: { id: field.id, update: { isActive: false } } },
    ),
  );
}

// Regras de etapa: tira os campos ocultos e soma as regras de documento
const { regrasEtapa } = await core(`query {
  regrasEtapa(first: 200) { edges { node { id name objectNameSingular stageFieldName stageValue requiredFieldNames } } }
}`);
const rules = regrasEtapa.edges.map((edge) => edge.node);
const itemsOf = (rule) => (Array.isArray(rule.requiredFieldNames) ? rule.requiredFieldNames : []);

for (const rule of rules.filter((item) => item.objectNameSingular === 'analiseJuridica')) {
  const kept = itemsOf(rule).filter((item) => !hiddenFieldNames.includes(item));
  if (kept.length !== itemsOf(rule).length) {
    await run(`regra ${rule.stageValue}: tirar campos ocultos (${itemsOf(rule).filter((item) => hiddenFieldNames.includes(item)).join(', ')})`, () =>
      core(
        `mutation($id: UUID!, $data: RegraEtapaUpdateInput!) { updateRegraEtapa(id: $id, data: $data) { id } }`,
        { id: rule.id, data: { requiredFieldNames: kept } },
      ),
    );
    rule.requiredFieldNames = kept;
  }
}

// 4. Regras de documento
console.log('4. Regras de documento da Análise Jurídica (status)');
const statusField = fieldOf(analise, 'status');
if (!statusField) {
  console.log('  Análise sem campo status — regras não criadas');
} else {
  for (const documentRule of DOCUMENT_RULES) {
    const existing = rules.find(
      (rule) =>
        rule.objectNameSingular === 'analiseJuridica' &&
        rule.stageFieldName === 'status' &&
        rule.stageValue === documentRule.stageValue,
    );
    if (existing) {
      const merged = [...new Set([...itemsOf(existing), ...documentRule.items])];
      if (merged.length === itemsOf(existing).length) {
        console.log(`  ${documentRule.stageValue} já exige os documentos`);
        continue;
      }
      await run(`${documentRule.stageValue}: somar ${documentRule.items.join(', ')}`, () =>
        core(
          `mutation($id: UUID!, $data: RegraEtapaUpdateInput!) { updateRegraEtapa(id: $id, data: $data) { id } }`,
          { id: existing.id, data: { requiredFieldNames: merged } },
        ),
      );
    } else {
      await run(`${documentRule.stageValue}: criar regra ${documentRule.items.join(', ')}`, () =>
        core(
          `mutation($data: RegraEtapaCreateInput!) { createRegraEtapa(data: $data) { id } }`,
          {
            data: {
              name: documentRule.name,
              objectNameSingular: 'analiseJuridica',
              stageFieldName: 'status',
              stageValue: documentRule.stageValue,
              requiredFieldNames: documentRule.items,
            },
          },
        ),
      );
    }
  }
}

console.log(APPLY ? 'Pronto.' : 'Simulação. Rode de novo com --aplicar.');

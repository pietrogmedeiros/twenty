# Alicerce — Método de construção via API de metadados (Twenty self-hosted)

> Fonte-de-verdade do modelo: `~/twenty/PRECATUR_MODEL.md`. Este arquivo documenta **COMO** construir (endpoint, auth, mutations) e traz o **rascunho** do objeto central Precatório. **Nada foi executado no Twenty** — falta a API Key.

## 1. Endpoint

- **Metadados (criar objetos/campos):** `http://localhost:3000/metadata` (driver Yoga, `path:'/metadata'`, scope `metadata`).
- **Dados (criar registros depois):** `http://localhost:3000/graphql` (schema separado).
- Wiring: `packages/twenty-server/src/engine/api/graphql/metadata.module-factory.ts`.
- ✅ Verificado ao vivo: `POST /metadata` responde **HTTP 200**.

## 2. Autenticação

- Header: `Authorization: Bearer <API_KEY>` + `Content-Type: application/json`.
- A API Key de **Settings → APIs & Webhooks** é um JWT usado direto como Bearer token.
- Guards: `WorkspaceAuthGuard` + `SettingsPermissionGuard(DATA_MODEL)` → a role da key precisa de permissão **Data Model / admin**.
- ✅ Verificado ao vivo: sem key, `createOneObject` e `createOneField` retornam `"Forbidden resource"` (FORBIDDEN) — ou seja, os nomes de mutation e o shape do input **já estão corretos**; só falta a key.

## 3. Bloqueios encontrados

1. **API Key ainda não fornecida** (Maestro/Clone entrega). É o único bloqueio real — sem ela nada roda.
2. **Introspection desabilitada** em runtime (`/metadata` recusa `__type`). Não usar introspecção; a fonte é o código (DTOs abaixo). Em dev há Playground na mesma URL, mas está off aqui.
3. **Relações precisam do `targetObjectMetadataId`** dos objetos nativos (Company, Person, WorkspaceMember). Esses IDs são por-workspace e devem ser obtidos **em runtime** via query `objects` (ver §6), não são fixos.

## 4. Mutation — criar OBJETO

DTO: `create-object.input.ts` → `createOneObject(input:{object: CreateObjectInput})`.
Campos: `nameSingular`, `namePlural`, `labelSingular`, `labelPlural` (obrigatórios, camelCase), + opcionais `description`, `icon`, `color`, `skipNameField`, `isLabelSyncedWithName`.

```graphql
mutation CriarPrecatorio {
  createOneObject(input: {
    object: {
      nameSingular: "precatorio"
      namePlural: "precatorios"
      labelSingular: "Precatório"
      labelPlural: "Precatórios"
      icon: "IconGavel"
      description: "Objeto central da operação Precatur"
    }
  }) {
    id            # <-- guardar: é o objectMetadataId usado em TODOS os campos abaixo
    nameSingular
    namePlural
  }
}
```
> Por padrão o Twenty cria automaticamente um campo `name` (TEXT) como rótulo do registro → usar como **Título**. (Se preferir criar Título manualmente, passar `skipNameField:true`.)

## 5. Mutation — criar CAMPO

DTO: `create-field.input.ts` / `field-metadata.dto.ts` → `createOneField(input:{field: CreateFieldInput})`.
Obrigatórios: `objectMetadataId` (UUID do objeto), `type` (enum `FieldMetadataType`), `name` (camelCase), `label`.
Opcionais: `description`, `icon`, `isNullable`, `isUnique`, `defaultValue`(JSON), `options`(JSON, p/ SELECT), `settings`(JSON, p/ CURRENCY/NUMBER), `relationCreationPayload`(JSON, p/ RELATION).

**Enum `FieldMetadataType`** (valores usados): `TEXT, NUMBER, CURRENCY, DATE, DATE_TIME, SELECT, MULTI_SELECT, BOOLEAN, RELATION`. (completos: ACTOR, ADDRESS, ARRAY, BOOLEAN, CURRENCY, DATE, DATE_TIME, EMAILS, FILES, FULL_NAME, LINKS, MORPH_RELATION, MULTI_SELECT, NUMBER, NUMERIC, PHONES, POSITION, RATING, RAW_JSON, RELATION, RICH_TEXT, SELECT, TEXT, TS_VECTOR, UUID.)

**Opções de SELECT** (`options.input.ts`): array de `{ label, value, color, position }`.
- `value` deve ser nome-enum válido (MAIÚSCULO/underscore: `ALIMENTAR`, `EM_NEGOCIACAO`).
- `color` ∈ TagColor: `red, ruby, crimson, tomato, orange, amber, yellow, lime, grass, green, jade, mint, turquoise, cyan, sky, blue, iris, violet, purple, plum, pink, bronze, gold, brown, gray`.
- `position` = índice numérico.

**RELATION** (`RelationCreationPayload`): usar `relationCreationPayload` em vez de `options`:
```
{ type: MANY_TO_ONE | ONE_TO_MANY, targetObjectMetadataId, targetFieldLabel, targetFieldIcon }
```

### 5.a Campos escalares do Precatório

```graphql
# Nº precatório
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:TEXT, name:"numeroPrecatorio", label:"Nº precatório", icon:"IconHash" }}){ id } }

# Nº processo originário
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:TEXT, name:"numeroProcessoOriginario", label:"Nº processo originário" }}){ id } }

# Ano orçamentário
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:NUMBER, name:"anoOrcamentario", label:"Ano orçamentário" }}){ id } }

# Valor de face (moeda)
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:CURRENCY, name:"valorDeFace", label:"Valor de face" }}){ id } }

# Valor atualizado (moeda)
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:CURRENCY, name:"valorAtualizado", label:"Valor atualizado" }}){ id } }

# Data-base
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:DATE, name:"dataBase", label:"Data-base" }}){ id } }
```

### 5.b Campos SELECT do Precatório

```graphql
# Tribunal
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:SELECT, name:"tribunal", label:"Tribunal", options:[
    { label:"TRF", value:"TRF", color:"blue",   position:0 },
    { label:"TJ",  value:"TJ",  color:"green",  position:1 },
    { label:"TRT", value:"TRT", color:"amber",  position:2 },
    { label:"STJ", value:"STJ", color:"purple", position:3 },
    { label:"STF", value:"STF", color:"red",    position:4 }
  ]}}){ id } }

# Natureza
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:SELECT, name:"natureza", label:"Natureza", options:[
    { label:"Alimentar", value:"ALIMENTAR", color:"green", position:0 },
    { label:"Comum",     value:"COMUM",     color:"gray",  position:1 }
  ]}}){ id } }

# Fase geral (dirige o Kanban geral — dono: Alicerce)
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:SELECT, name:"faseGeral", label:"Fase geral", options:[
    { label:"Prospecção",     value:"PROSPECCAO",     color:"gray",   position:0 },
    { label:"Comercial",      value:"COMERCIAL",      color:"blue",   position:1 },
    { label:"Jurídico",       value:"JURIDICO",       color:"purple", position:2 },
    { label:"Administrativo", value:"ADMINISTRATIVO", color:"amber",  position:3 },
    { label:"Financeiro",     value:"FINANCEIRO",     color:"green",  position:4 },
    { label:"Concluído",      value:"CONCLUIDO",      color:"jade",   position:5 },
    { label:"Descartado",     value:"DESCARTADO",     color:"red",    position:6 }
  ]}}){ id } }
```

### 5.c Campos RELATION do Precatório (MANY_TO_ONE → objetos nativos)

> Requer `targetObjectMetadataId` de Company / Person / WorkspaceMember — obter via §6 antes de rodar.

```graphql
# Ente devedor → Company
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:RELATION, name:"enteDevedor", label:"Ente devedor",
  relationCreationPayload:{ type:MANY_TO_ONE, targetObjectMetadataId:"<COMPANY_ID>",
    targetFieldLabel:"Precatórios (ente devedor)", targetFieldIcon:"IconGavel" }}}){ id } }

# Cedente → Person  (modelo cita Person/Company; usar Person como primário. Se precisar ambos → MORPH_RELATION)
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:RELATION, name:"cedente", label:"Cedente",
  relationCreationPayload:{ type:MANY_TO_ONE, targetObjectMetadataId:"<PERSON_ID>",
    targetFieldLabel:"Precatórios (cedente)", targetFieldIcon:"IconGavel" }}}){ id } }

# Advogado → Person
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:RELATION, name:"advogado", label:"Advogado",
  relationCreationPayload:{ type:MANY_TO_ONE, targetObjectMetadataId:"<PERSON_ID>",
    targetFieldLabel:"Precatórios (advogado)", targetFieldIcon:"IconGavel" }}}){ id } }

# Responsável → WorkspaceMember
mutation { createOneField(input:{ field:{
  objectMetadataId:"<PRECATORIO_ID>", type:RELATION, name:"responsavel", label:"Responsável",
  relationCreationPayload:{ type:MANY_TO_ONE, targetObjectMetadataId:"<WORKSPACE_MEMBER_ID>",
    targetFieldLabel:"Precatórios (responsável)", targetFieldIcon:"IconGavel" }}}){ id } }
```

## 6. Query auxiliar — descobrir IDs dos objetos nativos

Rodar antes das relações (§5.c) para pegar `targetObjectMetadataId` de Company/Person/WorkspaceMember:
```graphql
query { objects(paging:{first:200}){ edges{ node{ id nameSingular } } } }
```
Filtrar `nameSingular` ∈ {`company`, `person`, `workspaceMember`}.

## 7. Ordem de execução (quando a key chegar)

1. `createOneObject` Precatório → guardar `id`.
2. Query §6 → guardar IDs de company/person/workspaceMember.
3. Rodar campos escalares (§5.a) → SELECTs (§5.b) → RELATIONs (§5.c).
4. **`maestri ask`** para Pregão/Toga/Carimbo/Cofre: "Precatório existe, id=`<PRECATORIO_ID>`; criem seu objeto + relação MANY_TO_ONE → Precatório (targetObjectMetadataId=`<PRECATORIO_ID>`)."
5. Após setores: criar Kanban de **Fase geral** e integrar as views.

## 8. Snippet curl de teste (quando a key chegar)

```bash
curl -s http://localhost:3000/metadata \
  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
  -d '{"query":"mutation{createOneObject(input:{object:{nameSingular:\"precatorio\",namePlural:\"precatorios\",labelSingular:\"Precatório\",labelPlural:\"Precatórios\",icon:\"IconGavel\"}}){id}}"}'
```

### Referências de código
- `packages/twenty-server/src/engine/api/graphql/metadata.module-factory.ts` (endpoint/auth)
- `.../metadata-modules/object-metadata/dtos/create-object.input.ts`
- `.../metadata-modules/field-metadata/dtos/{create-field.input.ts,field-metadata.dto.ts,options.input.ts}`
- `packages/twenty-shared/src/types/{FieldMetadataType,RelationType,RelationCreationPayload}.ts`

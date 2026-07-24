# Build script — Objeto **Negociação** (Comercial) — dono: Pregão

> **NÃO EXECUTAR AINDA.** Aguardando (a) API Key do Maestro e (b) aviso do Alicerce de que o objeto **Precatório** existe (preciso do `objectMetadataId` dele para a relação).
> Fonte-de-verdade: `~/twenty/PRECATUR_MODEL.md`.

## Endpoints
- **Metadados** (objetos, campos): `POST http://localhost:3000/metadata`
- **Core** (views, view groups): `POST http://localhost:3000/graphql`
- Header em ambos: `Authorization: Bearer <API_KEY>` + `Content-Type: application/json`

## Placeholders a preencher antes de rodar
| Placeholder | Origem |
|---|---|
| `<API_KEY>` | Maestro (Settings → APIs & Webhooks) |
| `<PRECATORIO_OBJECT_METADATA_ID>` | Alicerce, após criar o objeto Precatório |
| `<NEGOCIACAO_OBJECT_METADATA_ID>` | resposta do **Passo 1** (createOneObject) |
| `<STATUS_FIELD_METADATA_ID>` | resposta do **Passo 2.status** (createOneField do Status) |
| `<PERSON_OBJECT_METADATA_ID>` | metadados nativos (query `objects`) — objeto People |
| `<WORKSPACE_MEMBER_OBJECT_METADATA_ID>` | metadados nativos — objeto workspaceMember |

Descobrir IDs nativos (People / workspaceMember) e confirmar o do Precatório:
```graphql
# POST /metadata
query { objects(paging:{first:200}) { edges { node { id nameSingular } } } }
```

---

## PASSO 1 — Criar objeto Negociação  (POST /metadata)
```graphql
mutation CreateNegociacaoObject {
  createOneObject(input: {
    object: {
      nameSingular: "negociacao"
      namePlural: "negociacoes"
      labelSingular: "Negociação"
      labelPlural: "Negociações"
      description: "Negociação comercial (pregão) de compra de precatório"
      icon: "IconGavel"
    }
  }) {
    id
    nameSingular
  }
}
```
➡️ Guarde `id` em `<NEGOCIACAO_OBJECT_METADATA_ID>`.

---

## PASSO 2 — Criar campos  (POST /metadata, um createOneField por vez)

> Regra: rodar Status ANTES da view (o Kanban agrupa por Status).
> Extras sugeridos e aprovados: **CPF/CNPJ do cedente**, **Valor de aquisição real**, **Margem/lucro esperado**.

### 2.1 — Canal/origem (SELECT)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "canalOrigem"
  label: "Canal/origem"
  type: SELECT
  icon: "IconRouteAltLeft"
  options: [
    { label: "Indicação",      value: "INDICACAO",      position: 0, color: "green" }
    { label: "Prospecção ativa", value: "PROSPECCAO_ATIVA", position: 1, color: "blue" }
    { label: "Inbound/site",    value: "INBOUND",        position: 2, color: "turquoise" }
    { label: "Advogado parceiro", value: "ADVOGADO_PARCEIRO", position: 3, color: "purple" }
    { label: "Outro",           value: "OUTRO",          position: 4, color: "gray" }
  ]
}}) { id name } }
```

### 2.2 — Valor ofertado (CURRENCY)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "valorOfertado"
  label: "Valor ofertado"
  type: CURRENCY
  icon: "IconCoin"
}}) { id name } }
```

### 2.3 — Valor de aquisição real (CURRENCY) — EXTRA
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "valorAquisicaoReal"
  label: "Valor de aquisição real"
  description: "Valor efetivamente pago ao cedente (pode divergir do ofertado)"
  type: CURRENCY
  icon: "IconCashBanknote"
}}) { id name } }
```

### 2.4 — Margem/lucro esperado (CURRENCY) — EXTRA
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "margemLucroEsperado"
  label: "Margem/lucro esperado"
  description: "Lucro estimado = valor de face/atualizado − valor de aquisição"
  type: CURRENCY
  icon: "IconTrendingUp"
}}) { id name } }
```

### 2.5 — Deságio % (NUMBER)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "desagioPercentual"
  label: "Deságio %"
  type: NUMBER
  icon: "IconPercentage"
  settings: { dataType: "float", decimals: 2 }
}}) { id name } }
```

### 2.6 — CPF/CNPJ do cedente (TEXT) — EXTRA
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "cpfCnpjCedente"
  label: "CPF/CNPJ do cedente"
  description: "Documento do cedente para KYC/contrato de cessão"
  type: TEXT
  icon: "IconId"
}}) { id name } }
```

### 2.7 — Status (SELECT) — rodar ANTES da view
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "status"
  label: "Status"
  type: SELECT
  icon: "IconProgressCheck"
  defaultValue: "'PROSPECCAO'"
  options: [
    { label: "Prospecção",      value: "PROSPECCAO",      position: 0, color: "gray" }
    { label: "Contato feito",   value: "CONTATO_FEITO",   position: 1, color: "blue" }
    { label: "Proposta enviada", value: "PROPOSTA_ENVIADA", position: 2, color: "turquoise" }
    { label: "Em negociação",   value: "EM_NEGOCIACAO",   position: 3, color: "yellow" }
    { label: "Aceito",          value: "ACEITO",          position: 4, color: "green" }
    { label: "Recusado",        value: "RECUSADO",        position: 5, color: "red" }
    { label: "Fechado",         value: "FECHADO",         position: 6, color: "purple" }
  ]
}}) { id name } }
```
➡️ Guarde `id` em `<STATUS_FIELD_METADATA_ID>` (usado no Kanban / view groups).

### 2.8 — Data proposta (DATE)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "dataProposta"
  label: "Data proposta"
  type: DATE
  icon: "IconCalendarUp"
}}) { id name } }
```

### 2.9 — Data fechamento (DATE)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "dataFechamento"
  label: "Data fechamento"
  type: DATE
  icon: "IconCalendarCheck"
}}) { id name } }
```

### 2.10 — Observações (RICH_TEXT / texto longo)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "observacoes"
  label: "Observações"
  type: RICH_TEXT
  icon: "IconNotes"
}}) { id name } }
```

---

## PASSO 3 — RELAÇÕES  (POST /metadata) — ⚠️ SÓ APÓS AVISO DO ALICERCE

### 3.1 — Negociação → Precatório (many-to-one) — **DEPENDE do Alicerce**
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "precatorio"
  label: "Precatório"
  type: RELATION
  icon: "IconFileText"
  relationCreationPayload: {
    type: MANY_TO_ONE
    targetObjectMetadataId: "<PRECATORIO_OBJECT_METADATA_ID>"
    targetFieldLabel: "Negociações"
    targetFieldIcon: "IconGavel"
  }
}}) { id name } }
```

### 3.2 — Cedente → People (many-to-one)
> Spec pede rel→Person/Company. Uso **People** nativo (cedente pessoa física é o caso comum);
> se o cedente for PJ, usar a relação Ente/Company do Precatório ou trocar target para Company.
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "cedente"
  label: "Cedente"
  type: RELATION
  icon: "IconUser"
  relationCreationPayload: {
    type: MANY_TO_ONE
    targetObjectMetadataId: "<PERSON_OBJECT_METADATA_ID>"
    targetFieldLabel: "Negociações (cedente)"
    targetFieldIcon: "IconGavel"
  }
}}) { id name } }
```

### 3.3 — Responsável comercial → workspaceMember (many-to-one)
```graphql
mutation { createOneField(input: { field: {
  objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
  name: "responsavelComercial"
  label: "Responsável comercial"
  type: RELATION
  icon: "IconUserStar"
  relationCreationPayload: {
    type: MANY_TO_ONE
    targetObjectMetadataId: "<WORKSPACE_MEMBER_OBJECT_METADATA_ID>"
    targetFieldLabel: "Negociações sob responsabilidade"
    targetFieldIcon: "IconGavel"
  }
}}) { id name } }
```

---

## PASSO 4 — VIEW Kanban por Status  (POST /graphql — API Core)

### 4.1 — Criar a view Kanban
```graphql
mutation CreateNegociacaoKanban {
  createView(input: {
    name: "Kanban por Status"
    objectMetadataId: "<NEGOCIACAO_OBJECT_METADATA_ID>"
    type: KANBAN
    icon: "IconLayoutKanban"
    position: 0
    mainGroupByFieldMetadataId: "<STATUS_FIELD_METADATA_ID>"
  }) {
    id
    name
  }
}
```
➡️ Guarde `id` em `<KANBAN_VIEW_ID>`.

### 4.2 — Criar as colunas do Kanban (view groups) — uma por valor de Status
> `fieldValue` = `value` da option de Status. Posições na mesma ordem do Status.
```graphql
# repetir para cada status (7 colunas)
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "PROSPECCAO",      position: 0, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "CONTATO_FEITO",   position: 1, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "PROPOSTA_ENVIADA", position: 2, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "EM_NEGOCIACAO",   position: 3, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "ACEITO",          position: 4, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "RECUSADO",         position: 5, isVisible: true }) { id } }
mutation { createViewGroup(input: { viewId: "<KANBAN_VIEW_ID>", fieldValue: "FECHADO",          position: 6, isVisible: true }) { id } }
```

---

## Ordem de execução (checklist)
1. [ ] Receber API Key + aviso do Alicerce (com `<PRECATORIO_OBJECT_METADATA_ID>`).
2. [ ] Query `objects` → pegar IDs de People e workspaceMember.
3. [ ] Passo 1 → `<NEGOCIACAO_OBJECT_METADATA_ID>`.
4. [ ] Passo 2 (campos 2.1→2.10) → guardar `<STATUS_FIELD_METADATA_ID>`.
5. [ ] Passo 3 (relações 3.1→3.3) — 3.1 exige o ID do Precatório.
6. [ ] Passo 4 (view Kanban + 7 view groups).
7. [ ] Avisar Alicerce que Negociação está pronta para integração/Kanban de Fase geral.

# Cofre — Setor Financeiro (objeto Pagamento)

**Status:** PREPARADO, não executado. Aguardando (a) API Key do Maestro e (b) aviso do
**Alicerce** de que o objeto **Precatório** existe (necessário para a relação many-to-one).

- Endpoint: `POST http://localhost:3000/metadata` (GraphQL de metadados)
- Header: `Authorization: Bearer <API_KEY>` + `Content-Type: application/json`
- Fonte-de-verdade: `~/twenty/PRECATUR_MODEL.md` (seção Pagamento/Financeiro)

Campos extras aprovados além do modelo base: **Valor de aquisição** (moeda),
**Deságio efetivo** (número %), **Dados bancários do cedente** (texto).

---

## Passo 0 — Descobrir IDs necessários (rodar antes das mutations)

Precisamos do `id` do objeto **Precatório** (dono: Alicerce) para criar a relação, e
confirmar o schema. Query:

```graphql
query ListObjects {
  objects(paging: { first: 100 }) {
    edges {
      node {
        id
        nameSingular
        namePlural
        labelSingular
        isCustom
      }
    }
  }
}
```

Anotar: `PRECATORIO_OBJECT_ID = <preencher após rodar>`
Após criar o objeto Pagamento (Passo 1), anotar `PAGAMENTO_OBJECT_ID`.

---

## Passo 1 — Criar o objeto Pagamento

```graphql
mutation CreatePagamentoObject {
  createOneObject(
    input: {
      object: {
        nameSingular: "pagamento"
        namePlural: "pagamentos"
        labelSingular: "Pagamento"
        labelPlural: "Pagamentos"
        description: "Movimentações financeiras (pagamento ao cedente / recebimento do ente) por precatório — setor Financeiro (Cofre)."
        icon: "IconCash"
      }
    }
  ) {
    id
    nameSingular
    labelSingular
  }
}
```

> Guardar o `id` retornado em `PAGAMENTO_OBJECT_ID`.

---

## Passo 2 — Criar os campos (usar PAGAMENTO_OBJECT_ID)

Cada bloco é uma mutation `createOneField`. Substituir `PAGAMENTO_OBJECT_ID`.

### 2.1 Tipo (seleção)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "tipo"
    label: "Tipo"
    type: SELECT
    icon: "IconArrowsExchange"
    options: [
      { value: "PAGAMENTO_AO_CEDENTE", label: "Pagamento ao cedente", color: "blue",  position: 0 }
      { value: "RECEBIMENTO_DO_ENTE",  label: "Recebimento do ente",  color: "green", position: 1 }
    ]
  }}) { id name }
}
```

### 2.2 Status (seleção) — usado no Kanban
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "status"
    label: "Status"
    type: SELECT
    icon: "IconProgressCheck"
    options: [
      { value: "PREVISTO",   label: "Previsto",   color: "gray",   position: 0 }
      { value: "AGENDADO",   label: "Agendado",   color: "blue",   position: 1 }
      { value: "PAGO",       label: "Pago",       color: "green",  position: 2 }
      { value: "RECEBIDO",   label: "Recebido",   color: "turquoise", position: 3 }
      { value: "CONCILIADO", label: "Conciliado", color: "purple", position: 4 }
      { value: "ATRASADO",   label: "Atrasado",   color: "red",    position: 5 }
    ]
  }}) { id name }
}
```

### 2.3 Valor (moeda)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "valor"
    label: "Valor"
    type: CURRENCY
    icon: "IconCurrencyReal"
  }}) { id name }
}
```

### 2.4 Valor de aquisição (moeda) — EXTRA
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "valorAquisicao"
    label: "Valor de aquisição"
    description: "Valor efetivamente pago ao cedente pela cessão (base do resultado)."
    type: CURRENCY
    icon: "IconShoppingCart"
  }}) { id name }
}
```

### 2.5 Deságio efetivo (número %) — EXTRA
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "desagioEfetivo"
    label: "Deságio efetivo"
    description: "Deságio realizado (%) entre valor de face e valor de aquisição."
    type: NUMBER
    icon: "IconPercentage"
    settings: { dataType: "float", decimals: 2 }
  }}) { id name }
}
```

### 2.6 Dados bancários do cedente (texto) — EXTRA
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "dadosBancariosCedente"
    label: "Dados bancários do cedente"
    description: "Banco / agência / conta ou chave PIX para execução do pagamento."
    type: TEXT
    icon: "IconBuildingBank"
  }}) { id name }
}
```

### 2.7 Data prevista (data) — usada no agrupamento da tabela
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "dataPrevista"
    label: "Data prevista"
    type: DATE
    icon: "IconCalendarEvent"
  }}) { id name }
}
```

### 2.8 Data efetiva (data)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "dataEfetiva"
    label: "Data efetiva"
    type: DATE
    icon: "IconCalendarCheck"
  }}) { id name }
}
```

### 2.9 Forma de pagamento (seleção)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "formaPagamento"
    label: "Forma de pagamento"
    type: SELECT
    icon: "IconWallet"
    options: [
      { value: "TED",     label: "TED",      color: "blue",   position: 0 }
      { value: "PIX",     label: "PIX",      color: "green",  position: 1 }
      { value: "DOC",     label: "DOC",      color: "gray",   position: 2 }
      { value: "BOLETO",  label: "Boleto",   color: "orange", position: 3 }
      { value: "DEPOSITO_JUDICIAL", label: "Depósito judicial", color: "purple", position: 4 }
    ]
  }}) { id name }
}
```

### 2.10 Impostos/retenções (moeda) — cobre IR retido na fonte
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "impostosRetencoes"
    label: "Impostos/retenções"
    description: "Total de retenções (IR na fonte, contribuições) sobre o pagamento."
    type: CURRENCY
    icon: "IconReceiptTax"
  }}) { id name }
}
```

### 2.11 Comprovante (anexo)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "comprovante"
    label: "Comprovante"
    type: TEXT
    icon: "IconPaperclip"
    description: "Link/registro do comprovante. (Upload de arquivo anexado via aba Attachments do registro.)"
  }}) { id name }
}
```

### 2.12 Responsável financeiro (relação → membro)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "responsavelFinanceiro"
    label: "Responsável financeiro"
    type: RELATION
    icon: "IconUserDollar"
    relationCreationPayload: {
      targetObjectMetadataId: "WORKSPACE_MEMBER_OBJECT_ID"
      type: MANY_TO_ONE
      targetFieldLabel: "Pagamentos"
      targetFieldIcon: "IconCash"
    }
  }}) { id name }
}
```
> `WORKSPACE_MEMBER_OBJECT_ID` = id do objeto `workspaceMember` (obter no Passo 0).

### 2.13 Observações (texto longo)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "observacoes"
    label: "Observações"
    type: TEXT
    icon: "IconNotes"
  }}) { id name }
}
```

---

## Passo 3 — Relação Pagamento → Precatório (many-to-one)

> **DEPENDÊNCIA:** só executar após o aviso do **Alicerce** e com `PRECATORIO_OBJECT_ID`
> preenchido. Cria a relação N Pagamentos → 1 Precatório (aba "Pagamentos" dentro do Precatório).

```graphql
mutation CreateRelacaoPagamentoPrecatorio {
  createOneField(input: { field: {
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    name: "precatorio"
    label: "Precatório"
    type: RELATION
    icon: "IconGavel"
    relationCreationPayload: {
      targetObjectMetadataId: "PRECATORIO_OBJECT_ID"
      type: MANY_TO_ONE
      targetFieldLabel: "Pagamentos"
      targetFieldIcon: "IconCash"
    }
  }}) { id name }
}
```

---

## Passo 4 — Views do Financeiro

Views no Twenty são registros do core (endpoint `/graphql`, mesma API Key). Criar após os
campos existirem, usando `PAGAMENTO_OBJECT_ID` e os `id` dos campos `status` e `dataPrevista`.

### 4.1 Tabela agrupada por Data prevista
```graphql
mutation CreateViewTabelaPagamentos {
  createCoreView(input: {
    name: "Pagamentos — por Data prevista"
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    type: "table"
    icon: "IconTable"
    kanbanFieldMetadataId: ""
  }) { id name }
}
```
Em seguida configurar o agrupamento por `dataPrevista` (campo `viewGroups` / `groupByFieldMetadataId`):
```graphql
mutation SetGroupByDataPrevista {
  updateCoreView(
    id: "VIEW_TABELA_ID"
    input: { groupByFieldMetadataId: "DATA_PREVISTA_FIELD_ID" }
  ) { id }
}
```

### 4.2 Kanban por Status
```graphql
mutation CreateViewKanbanPagamentos {
  createCoreView(input: {
    name: "Pagamentos — Kanban por Status"
    objectMetadataId: "PAGAMENTO_OBJECT_ID"
    type: "kanban"
    icon: "IconLayoutKanban"
    kanbanFieldMetadataId: "STATUS_FIELD_ID"
  }) { id name }
}
```

> Nota: nomes/args exatos de view (`createCoreView`/`type`) podem variar por versão do
> Twenty. Validar contra o schema introspectivo do `/graphql` antes de executar; se a versão
> não expuser criação de view por API, criar as 2 views pela UI (Financeiro → +Adicionar view)
> com os mesmos parâmetros: **Tabela agrupada por "Data prevista"** e **Kanban por "Status"**.

---

## Checklist de execução (quando a key chegar + Alicerce avisar)
1. [ ] Rodar Passo 0 → anotar `PRECATORIO_OBJECT_ID` e `WORKSPACE_MEMBER_OBJECT_ID`.
2. [ ] Passo 1 → criar objeto → anotar `PAGAMENTO_OBJECT_ID`.
3. [ ] Passo 2.1–2.13 → criar campos (anotar `STATUS_FIELD_ID`, `DATA_PREVISTA_FIELD_ID`).
4. [ ] Passo 3 → relação → Precatório (só após aviso do Alicerce).
5. [ ] Passo 4 → 2 views (tabela por Data prevista + Kanban por Status).
6. [ ] Reportar ao Maestro e ao Alicerce para integração (Kanban de Fase geral).

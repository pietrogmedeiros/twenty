# Toga — Objeto "Análise Jurídica" (setor Jurídico / Precatur)

Scripts de mutations para a **API de metadados** do Twenty (GraphQL, endpoint `/metadata`).
**NÃO EXECUTAR AINDA.** Aguardando: (1) API Key do Maestro; (2) aviso do **Alicerce** de que o objeto **Precatório** existe (para pegar o `objectMetadataId` real e criar a relação).

## Pré-requisitos
- **Endpoint:** `http://localhost:3000/metadata`
- **Headers:** `Authorization: Bearer <API_KEY>` + `Content-Type: application/json`
- **Placeholder a substituir:**
  - `<JURIDICO_OBJECT_ID>` → `id` retornado no passo 1 (createOneObject).
  - `<PRECATORIO_OBJECT_ID>` → `objectMetadataId` do objeto **Precatório** (fornecido pelo Alicerce).

---

## Passo 1 — Criar o objeto "Análise Jurídica"

```graphql
mutation CreateAnaliseJuridicaObject {
  createOneObject(
    input: {
      object: {
        nameSingular: "analiseJuridica"
        namePlural: "analisesJuridicas"
        labelSingular: "Análise Jurídica"
        labelPlural: "Análises Jurídicas"
        description: "Análise jurídica de precatórios (setor Jurídico — Precatur)"
        icon: "IconGavel"
      }
    }
  ) {
    id
    nameSingular
    labelSingular
  }
}
```

> Guarde o `id` retornado como `<JURIDICO_OBJECT_ID>`.

---

## Passo 2 — Criar os campos (createOneField)

Cada bloco é uma mutation independente. Todos usam `objectMetadataId: "<JURIDICO_OBJECT_ID>"`.

### 2.1 Status (SELECT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: SELECT
    name: "status"
    label: "Status"
    icon: "IconProgressCheck"
    options: [
      { value: "PENDENTE",     label: "Pendente",      position: 0, color: "gray"   }
      { value: "EM_ANALISE",   label: "Em análise",    position: 1, color: "blue"   }
      { value: "APROVADO",     label: "Aprovado",      position: 2, color: "green"  }
      { value: "REPROVADO",    label: "Reprovado",     position: 3, color: "red"    }
      { value: "COM_RESSALVAS",label: "Com ressalvas", position: 4, color: "orange" }
    ]
    defaultValue: "'PENDENTE'"
  }}) { id name type }
}
```

### 2.2 Risco (SELECT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: SELECT
    name: "risco"
    label: "Risco"
    icon: "IconAlertTriangle"
    options: [
      { value: "BAIXO", label: "Baixo", position: 0, color: "green"  }
      { value: "MEDIO", label: "Médio", position: 1, color: "yellow" }
      { value: "ALTO",  label: "Alto",  position: 2, color: "red"    }
    ]
    defaultValue: "'MEDIO'"
  }}) { id name type }
}
```

### 2.3 Tem penhora/bloqueio (BOOLEAN)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: BOOLEAN
    name: "temPenhoraBloqueio"
    label: "Tem penhora/bloqueio"
    icon: "IconLock"
    defaultValue: false
  }}) { id name type }
}
```

### 2.4 Cessões anteriores (BOOLEAN)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: BOOLEAN
    name: "cessoesAnteriores"
    label: "Cessões anteriores"
    icon: "IconArrowsExchange"
    defaultValue: false
  }}) { id name type }
}
```

### 2.5 Retenção IR/contrib (CURRENCY)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: CURRENCY
    name: "retencaoIr"
    label: "Retenção IR/contrib"
    icon: "IconReceiptTax"
  }}) { id name type }
}
```

### 2.6 Honorários destacados (CURRENCY)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: CURRENCY
    name: "honorariosDestacados"
    label: "Honorários destacados"
    icon: "IconCash"
  }}) { id name type }
}
```

### 2.7 Valor líquido estimado (CURRENCY)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: CURRENCY
    name: "valorLiquidoEstimado"
    label: "Valor líquido estimado"
    icon: "IconCoin"
  }}) { id name type }
}
```

### 2.8 Contrato cessão (SELECT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: SELECT
    name: "contratoCessao"
    label: "Contrato cessão"
    icon: "IconFileText"
    options: [
      { value: "NAO",          label: "Não",          position: 0, color: "gray"  }
      { value: "EM_ELABORACAO",label: "Em elaboração",position: 1, color: "blue"  }
      { value: "ASSINADO",     label: "Assinado",     position: 2, color: "green" }
    ]
    defaultValue: "'NAO'"
  }}) { id name type }
}
```

### 2.9 Parecer jurídico (RICH_TEXT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: RICH_TEXT
    name: "parecerJuridico"
    label: "Parecer jurídico"
    icon: "IconFileDescription"
  }}) { id name type }
}
```

### 2.10 Data análise (DATE_TIME)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: DATE_TIME
    name: "dataAnalise"
    label: "Data análise"
    icon: "IconCalendar"
  }}) { id name type }
}
```

### 2.11 [EXTRA] Trânsito em julgado / recurso pendente (SELECT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: SELECT
    name: "transitoRecurso"
    label: "Trânsito em julgado/recurso pendente"
    icon: "IconGavel"
    options: [
      { value: "TRANSITADO",       label: "Transitado em julgado", position: 0, color: "green"  }
      { value: "RECURSO_PENDENTE", label: "Recurso pendente",      position: 1, color: "red"    }
      { value: "NAO_APLICAVEL",    label: "Não aplicável",         position: 2, color: "gray"   }
    ]
    defaultValue: "'RECURSO_PENDENTE'"
  }}) { id name type }
}
```

### 2.12 [EXTRA] Vara/Comarca de origem (TEXT)
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: TEXT
    name: "varaComarcaOrigem"
    label: "Vara/Comarca de origem"
    icon: "IconBuildingBank"
  }}) { id name type }
}
```

### 2.13 Advogado responsável (RELATION → WorkspaceMember, MANY_TO_ONE)
> Reaproveita o objeto nativo **workspaceMember** (membros da workspace).
```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: RELATION
    name: "advogadoResponsavel"
    label: "Advogado responsável"
    icon: "IconUserShield"
    relationCreationPayload: {
      type: MANY_TO_ONE
      targetObjectMetadataId: "<WORKSPACE_MEMBER_OBJECT_ID>"
      targetFieldLabel: "Análises Jurídicas"
      targetFieldIcon: "IconGavel"
    }
  }}) { id name type }
}
```
> `<WORKSPACE_MEMBER_OBJECT_ID>`: obter via query `objects` (nameSingular = "workspaceMember").

---

## Passo 3 — RELAÇÃO Análise Jurídica → Precatório (DEPENDE DO ALICERCE)

**Só executar após o Alicerce confirmar que o objeto Precatório existe** e fornecer `<PRECATORIO_OBJECT_ID>`.
Relação **many-to-one**: N análises jurídicas → 1 precatório.

```graphql
mutation {
  createOneField(input: { field: {
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: RELATION
    name: "precatorio"
    label: "Precatório"
    icon: "IconFileInvoice"
    relationCreationPayload: {
      type: MANY_TO_ONE
      targetObjectMetadataId: "<PRECATORIO_OBJECT_ID>"
      targetFieldLabel: "Análises Jurídicas"
      targetFieldIcon: "IconGavel"
    }
  }}) { id name type }
}
```

---

## Passo 4 — View Kanban por Status (agrupada por Risco)

Views são criadas via API **core** (`/graphql`), não `/metadata`. Requer os `id` dos campos `status` e `risco` (retornados nos passos 2.1 e 2.2) e o `<JURIDICO_OBJECT_ID>`.

### 4.1 Criar a view (tipo Kanban, agrupando por Status)
```graphql
mutation {
  createCoreView(input: {
    name: "Kanban Jurídico por Status"
    objectMetadataId: "<JURIDICO_OBJECT_ID>"
    type: KANBAN
    icon: "IconLayoutKanban"
    kanbanFieldMetadataId: "<STATUS_FIELD_ID>"
  }) { id name type }
}
```

### 4.2 Agrupar por Risco (viewGroup no campo Risco)
```graphql
mutation {
  createCoreViewGroup(input: {
    viewId: "<VIEW_ID>"
    fieldMetadataId: "<RISCO_FIELD_ID>"
    isVisible: true
  }) { id }
}
```

> Nota de implementação: no Twenty o Kanban usa **um** campo SELECT para as colunas (`kanbanFieldMetadataId` = Status) e o "agrupar por" adicional (Risco) é aplicado como `viewGroup`/segmentação. Se a versão instalada não expuser `createCoreViewGroup`, aplicar o agrupamento por Risco manualmente na UI da view após criá-la, ou criar uma 2ª view Kanban por Risco. Confirmar o schema exato com introspection antes de executar.

---

## Checklist de execução (quando a key + aviso chegarem)
- [ ] Substituir `<JURIDICO_OBJECT_ID>`, `<PRECATORIO_OBJECT_ID>`, `<WORKSPACE_MEMBER_OBJECT_ID>`, IDs de campos e view.
- [ ] Passo 1 (objeto) → guardar id.
- [ ] Passos 2.1–2.13 (campos) → guardar ids de status e risco.
- [ ] Passo 3 (relação → Precatório) **só após aviso do Alicerce**.
- [ ] Passo 4 (view Kanban).
- [ ] Validar via introspection / UI em http://localhost:3000.

## Coordenação
- `maestri list` para ver colegas; integrador = **Alicerce**.
- `maestri ask "Alicerce" "Precatório já existe? Preciso do objectMetadataId para a relação."`

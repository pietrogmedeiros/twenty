# Carimbo — Setor Administrativo (Precatur)

Objeto **Processo Administrativo** + campos + view **Kanban por Status**.

> ⚠️ NÃO EXECUTAR AINDA. Aguardando: (1) API Key do Maestro; (2) aviso do **Alicerce**
> (o objeto Precatório precisa existir antes de criar a relação many-to-one).
>
> Endpoint metadados: `POST http://localhost:3000/metadata`
> Header: `Authorization: Bearer <API_KEY>` · `Content-Type: application/json`
> Endpoint core (views): `POST http://localhost:3000/graphql`

---

## PASSO 1 — Criar o objeto

```graphql
mutation CreateProcessoAdministrativo {
  createOneObject(input: {
    object: {
      nameSingular: "processoAdministrativo"
      namePlural: "processosAdministrativos"
      labelSingular: "Processo Administrativo"
      labelPlural: "Processos Administrativos"
      description: "Etapa administrativa do precatório (protocolo, habilitação, fila cronológica)"
      icon: "IconStamp"
    }
  }) {
    id
    nameSingular
  }
}
```

> Guardar o `id` retornado como `OBJECT_ID` para os campos abaixo.

---

## PASSO 2 — Criar os campos

Substituir `OBJECT_ID` pelo id do passo 1 em cada mutation.

### 2.1 Status (SELECT) — usado pelo Kanban

```graphql
mutation CreateStatusField {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: SELECT
    name: "status"
    label: "Status"
    icon: "IconProgressCheck"
    options: [
      { value: "A_PROTOCOLAR",        label: "A protocolar",         color: "gray",   position: 0 }
      { value: "PROTOCOLADO",         label: "Protocolado",          color: "blue",   position: 1 }
      { value: "EM_HABILITACAO",      label: "Em habilitação",       color: "yellow", position: 2 }
      { value: "HABILITADO",          label: "Habilitado",           color: "green",  position: 3 }
      { value: "PENDENCIA_DOCUMENTAL",label: "Pendência documental", color: "red",    position: 4 }
      { value: "CONCLUIDO",           label: "Concluído",            color: "turquoise", position: 5 }
    ]
    defaultValue: "'A_PROTOCOLAR'"
  }}) { id name }
}
```

### 2.2 Nº protocolo (TEXT)

```graphql
mutation CreateNumProtocolo {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "numeroProtocolo"
    label: "Nº protocolo"
    icon: "IconHash"
  }}) { id name }
}
```

### 2.3 Órgão de protocolo (SELECT)

```graphql
mutation CreateOrgaoProtocolo {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: SELECT
    name: "orgaoProtocolo"
    label: "Órgão de protocolo"
    icon: "IconBuildingBank"
    options: [
      { value: "TRF",  label: "TRF",  color: "blue",   position: 0 }
      { value: "TJ",   label: "TJ",   color: "green",  position: 1 }
      { value: "TRT",  label: "TRT",  color: "orange", position: 2 }
      { value: "STJ",  label: "STJ",  color: "purple", position: 3 }
      { value: "STF",  label: "STF",  color: "red",    position: 4 }
      { value: "OUTRO",label: "Outro",color: "gray",   position: 5 }
    ]
  }}) { id name }
}
```

### 2.4 Data protocolo (DATE)

```graphql
mutation CreateDataProtocolo {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: DATE
    name: "dataProtocolo"
    label: "Data protocolo"
    icon: "IconCalendar"
  }}) { id name }
}
```

### 2.5 Documentos pendentes (TEXT)

```graphql
mutation CreateDocumentosPendentes {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "documentosPendentes"
    label: "Documentos pendentes"
    icon: "IconFileAlert"
  }}) { id name }
}
```

### 2.6 Cartório/registro (TEXT)

```graphql
mutation CreateCartorioRegistro {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "cartorioRegistro"
    label: "Cartório/registro"
    icon: "IconBook"
  }}) { id name }
}
```

### 2.7 Ofício requisitório — DATA (DATE)

```graphql
mutation CreateOficioRequisitorioData {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: DATE
    name: "oficioRequisitorioData"
    label: "Ofício requisitório (data)"
    icon: "IconCalendarStats"
  }}) { id name }
}
```

### 2.8 ⭐ EXTRA — Nº do ofício requisitório (TEXT)

```graphql
mutation CreateNumOficioRequisitorio {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "numeroOficioRequisitorio"
    label: "Nº do ofício requisitório"
    icon: "IconFileText"
  }}) { id name }
}
```

### 2.9 ⭐ EXTRA — Situação na fila cronológica (TEXT)

```graphql
mutation CreateSituacaoFilaCronologica {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "situacaoFilaCronologica"
    label: "Situação na fila cronológica"
    icon: "IconListNumbers"
  }}) { id name }
}
```

> Nota: mantido como TEXT para admitir formatos como "128/2027" ou "Aguardando inclusão".
> Se o cliente exigir posição numérica pura, criar campo NUMBER `posicaoFilaCronologica` adicional.

### 2.10 ⭐ EXTRA — Exercício de pagamento (NUMBER)

```graphql
mutation CreateExercicioPagamento {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: NUMBER
    name: "exercicioPagamento"
    label: "Exercício de pagamento"
    icon: "IconCalendarDollar"
    settings: { dataType: "int" }
  }}) { id name }
}
```

### 2.11 Responsável administrativo (RELATION → WorkspaceMember)

```graphql
mutation CreateResponsavelAdministrativo {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: RELATION
    name: "responsavelAdministrativo"
    label: "Responsável administrativo"
    icon: "IconUser"
    relationCreationPayload: {
      type: MANY_TO_ONE
      targetObjectMetadataId: "WORKSPACE_MEMBER_OBJECT_ID"
      targetFieldLabel: "Processos administrativos"
      targetFieldIcon: "IconStamp"
    }
  }}) { id name }
}
```

> `WORKSPACE_MEMBER_OBJECT_ID` = id do objeto `workspaceMember` (consultar via `objects` query).

### 2.12 Observações (TEXT / rich)

```graphql
mutation CreateObservacoes {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: TEXT
    name: "observacoes"
    label: "Observações"
    icon: "IconNotes"
  }}) { id name }
}
```

---

## PASSO 3 — 🔒 RELAÇÃO com Precatório (SÓ APÓS AVISO DO ALICERCE)

> Não executar até o Alicerce confirmar que o objeto **Precatório** existe.
> Obter `PRECATORIO_OBJECT_ID` via query `objects`.

```graphql
mutation CreateRelacaoPrecatorio {
  createOneField(input: { field: {
    objectMetadataId: "OBJECT_ID"
    type: RELATION
    name: "precatorio"
    label: "Precatório"
    icon: "IconGavel"
    relationCreationPayload: {
      type: MANY_TO_ONE
      targetObjectMetadataId: "PRECATORIO_OBJECT_ID"
      targetFieldLabel: "Processos administrativos"
      targetFieldIcon: "IconStamp"
    }
  }}) { id name }
}
```

---

## PASSO 4 — View Kanban por Status (endpoint /graphql — core)

Requer `OBJECT_ID` e o `STATUS_FIELD_ID` (id retornado em 2.1).

```graphql
mutation CreateViewKanbanAdministrativo {
  createCoreView(input: {
    name: "Kanban Administrativo"
    objectMetadataId: "OBJECT_ID"
    type: "kanban"
    icon: "IconLayoutKanban"
    kanbanFieldMetadataId: "STATUS_FIELD_ID"
    key: null
    position: 0
  }) {
    id
    name
  }
}
```

> Se a versão do Twenty expuser `createOneView` no /metadata em vez de `createCoreView`,
> usar o mesmo payload trocando o nome da mutation. Confirmar assinatura no schema antes.

---

## Verificação pós-execução

```graphql
query CheckProcessoAdministrativo {
  object(input: { nameSingular: "processoAdministrativo" }) {
    id
    labelSingular
    fields(paging: { first: 50 }) {
      edges { node { name label type } }
    }
  }
}
```

Checklist de campos esperados: status, numeroProtocolo, orgaoProtocolo, dataProtocolo,
documentosPendentes, cartorioRegistro, oficioRequisitorioData, **numeroOficioRequisitorio**,
**situacaoFilaCronologica**, **exercicioPagamento**, responsavelAdministrativo, observacoes,
precatorio (após Alicerce).

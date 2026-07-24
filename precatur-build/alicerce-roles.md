# Alicerce — Roles & Permissões por setor (Precatur)

> Fonte-de-verdade: `~/twenty/PRECATUR_MODEL.md` §PERMISSÕES. **Nada executado** — aguardando API Key do Maestro. Complementa `alicerce-metodo.md`.

## Resposta curta: SIM, roles via API — **tudo pelo `/metadata` GraphQL**
Roles e permissões **por objeto** são criáveis pela API de metadados (mesma URL `http://localhost:3000/metadata`, mesmo Bearer token). **Nenhum passo manual na UI é obrigatório** e **não há feature flag** bloqueando. Confirmado por código (`RoleResolver`) **e** por probe ao vivo (as mutations existem no schema).

## Como faremos (padrão "edita o próprio, lê os demais")
Para cada setor: (1) `createOneRole` com `canReadAllObjectRecords:true` + todos os `canUpdate/SoftDelete/Destroy:false` → lê tudo (Precatório central + demais setores + nativos), edita nada por padrão. (2) `upsertObjectPermissions` liberando `canUpdateObjectRecords:true` **só no objeto do próprio setor**. (3) `updateWorkspaceMemberRole` para atribuir ao membro. Admin (dono) mantém acesso total (role Admin nativa, intocada).

## Bloqueio / pré-requisitos
1. **API Key** ainda não chegou (único bloqueio real).
2. A key precisa pertencer a uma role com o **flag de permissão `ROLES`** (admin/settings) — todo o `RoleResolver` é guardado por `SettingsPermissionGuard(ROLES)`. A key padrão de admin serve.
3. **Ordem:** os objetos de setor precisam existir antes do passo 2 (precisamos do `objectMetadataId` de cada um). Logo: Alicerce cria Precatório → setores criam seus objetos → **só então** rodamos os roles.
4. `updateWorkspaceMemberRole` lança `CANNOT_UPDATE_SELF_ROLE` se tentar mudar a própria role — atribuir a partir do admin para OUTROS membros.

---

## Referência de schema (confirmado ao vivo + código)

`role.resolver.ts` — `@MetadataResolver`, scope `metadata`; classe inteira sob `@UseGuards(WorkspaceAuthGuard, SettingsPermissionGuard(ROLES))`.

- `createOneRole(createRoleInput: CreateRoleInput!): RoleDTO`
  Campos: `label`(**obrigatório**), `id?`, `description?`, `icon?`, e booleanos `canUpdateAllSettings?`, `canAccessAllTools?`, `canReadAllObjectRecords?`, `canUpdateAllObjectRecords?`, `canSoftDeleteAllObjectRecords?`, `canDestroyAllObjectRecords?`, `canBeAssignedToUsers?`, `canBeAssignedToAgents?`, `canBeAssignedToApiKeys?`.
- `updateOneRole(updateRoleInput: UpdateRoleInput!): RoleDTO` — shape `{ id:UUID!, update: UpdateRolePayload! }` (mesmos campos do create).
- `deleteOneRole(roleId: UUID!): String`.
- `upsertObjectPermissions(upsertObjectPermissionsInput: UpsertObjectPermissionsInput!): [ObjectPermissionDTO]`
  `{ roleId:UUID!, objectPermissions:[ObjectPermissionInput!]! }`; cada item: `objectMetadataId:UUID!`, `canReadObjectRecords?`, `canUpdateObjectRecords?`, `canSoftDeleteObjectRecords?`, `canDestroyObjectRecords?`.
- `updateWorkspaceMemberRole(workspaceMemberId: UUID!, roleId: UUID!): WorkspaceMemberDTO` (guard extra `UserAuthGuard`).
- (bônus) `upsertFieldPermissions(...)` para permissão por CAMPO — `{ roleId, fieldPermissions:[{ objectMetadataId, fieldMetadataId, canReadFieldValue?, canUpdateFieldValue? }] }`. Não necessário agora.
- `assignRoleToAgent(agentId, roleId)` / `removeRoleFromAgent(agentId)` — para agentes IA.

---

## Passo a passo — os 4 roles

Objetos de setor (nomes a confirmar quando os setores criarem):
Comercial→`<NEGOCIACAO_OBJ_ID>`, Jurídico→`<ANALISE_JURIDICA_OBJ_ID>`, Administrativo→`<PROCESSO_ADMIN_OBJ_ID>`, Financeiro→`<PAGAMENTO_OBJ_ID>`.
IDs obtidos via: `query { objects(paging:{first:200}){ edges{ node{ id nameSingular } } } }`.

### Passo 1 — criar as 4 roles (mesmo template, muda label/icon)

```graphql
# Comercial
mutation { createOneRole(createRoleInput:{
  label:"Comercial", icon:"IconBuildingStore",
  canReadAllObjectRecords:true,
  canUpdateAllObjectRecords:false, canSoftDeleteAllObjectRecords:false, canDestroyAllObjectRecords:false,
  canUpdateAllSettings:false, canBeAssignedToUsers:true
}){ id label } }

# Jurídico
mutation { createOneRole(createRoleInput:{
  label:"Jurídico", icon:"IconGavel",
  canReadAllObjectRecords:true,
  canUpdateAllObjectRecords:false, canSoftDeleteAllObjectRecords:false, canDestroyAllObjectRecords:false,
  canUpdateAllSettings:false, canBeAssignedToUsers:true
}){ id label } }

# Administrativo
mutation { createOneRole(createRoleInput:{
  label:"Administrativo", icon:"IconStamp",
  canReadAllObjectRecords:true,
  canUpdateAllObjectRecords:false, canSoftDeleteAllObjectRecords:false, canDestroyAllObjectRecords:false,
  canUpdateAllSettings:false, canBeAssignedToUsers:true
}){ id label } }

# Financeiro
mutation { createOneRole(createRoleInput:{
  label:"Financeiro", icon:"IconCashBanknote",
  canReadAllObjectRecords:true,
  canUpdateAllObjectRecords:false, canSoftDeleteAllObjectRecords:false, canDestroyAllObjectRecords:false,
  canUpdateAllSettings:false, canBeAssignedToUsers:true
}){ id label } }
```
Guardar os 4 `id` retornados → `<ROLE_COMERCIAL_ID>` etc.

### Passo 2 — liberar edição SÓ do objeto do próprio setor

```graphql
# Comercial edita Negociação; lê o resto (herda canReadAllObjectRecords:true)
mutation { upsertObjectPermissions(upsertObjectPermissionsInput:{
  roleId:"<ROLE_COMERCIAL_ID>",
  objectPermissions:[{ objectMetadataId:"<NEGOCIACAO_OBJ_ID>",
    canReadObjectRecords:true, canUpdateObjectRecords:true,
    canSoftDeleteObjectRecords:true, canDestroyObjectRecords:false }]
}){ canUpdateObjectRecords } }

# Jurídico edita Análise Jurídica
mutation { upsertObjectPermissions(upsertObjectPermissionsInput:{
  roleId:"<ROLE_JURIDICO_ID>",
  objectPermissions:[{ objectMetadataId:"<ANALISE_JURIDICA_OBJ_ID>",
    canReadObjectRecords:true, canUpdateObjectRecords:true,
    canSoftDeleteObjectRecords:true, canDestroyObjectRecords:false }]
}){ canUpdateObjectRecords } }

# Administrativo edita Processo Administrativo
mutation { upsertObjectPermissions(upsertObjectPermissionsInput:{
  roleId:"<ROLE_ADMINISTRATIVO_ID>",
  objectPermissions:[{ objectMetadataId:"<PROCESSO_ADMIN_OBJ_ID>",
    canReadObjectRecords:true, canUpdateObjectRecords:true,
    canSoftDeleteObjectRecords:true, canDestroyObjectRecords:false }]
}){ canUpdateObjectRecords } }

# Financeiro edita Pagamento
mutation { upsertObjectPermissions(upsertObjectPermissionsInput:{
  roleId:"<ROLE_FINANCEIRO_ID>",
  objectPermissions:[{ objectMetadataId:"<PAGAMENTO_OBJ_ID>",
    canReadObjectRecords:true, canUpdateObjectRecords:true,
    canSoftDeleteObjectRecords:true, canDestroyObjectRecords:false }]
}){ canUpdateObjectRecords } }
```
> Precatório central e demais objetos-setor ficam **read-only** para cada role (herdado do default). Isso satisfaz "edita só o seu, lê os demais + o central".

### Passo 3 — atribuir role aos membros

```graphql
# repetir por membro de cada setor (a partir do admin, nunca no próprio usuário)
mutation { updateWorkspaceMemberRole(
  workspaceMemberId:"<MEMBRO_ID>", roleId:"<ROLE_DO_SETOR_ID>"
){ id } }
```
IDs de membros: `query { workspaceMembers { id name { firstName lastName } } }` (schema core `/graphql`).

---

## Ordem final integrada (quando a key chegar)
1. Alicerce cria Precatório + campos (`alicerce-metodo.md`).
2. Setores criam seus objetos + relação → Precatório.
3. Alicerce roda **Passo 1→2→3** deste doc (precisa dos `objectMetadataId` dos setores).
4. Testar login por role: cada setor edita só o seu, vê os demais em read-only.

### Arquivos de código de referência
- `packages/twenty-server/src/engine/metadata-modules/role/role.resolver.ts`
- `.../role/dtos/{create-role.input.ts,update-role.input.ts}`
- `.../object-permission/dtos/{upsert-object-permissions.input.ts,upsert-field-permissions.input.ts}`
- `.../guards/settings-permission.guard.ts` (guard `ROLES`)

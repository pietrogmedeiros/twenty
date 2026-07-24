# Plano de porte — Gerador de Proposta (Precatur → Twenty CRM)

> **Fase: PLANEJAR.** Nada é editado no Twenty ainda. Fonte-de-verdade do modelo: `~/twenty/PRECATUR_MODEL.md`.
> Origem do gerador: `~/Downloads/precatur/frontend/app/(dashboard)/proposta/page.tsx` (~695 linhas) + estilos em `~/Downloads/precatur/frontend/app/globals.css` (bloco `.proposal-doc` / `@media print`).
> Depende de: objetos **Precatório** (Alicerce, `objectMetadataId = 806a2b72-3b51-4aaf-a9f0-476742586877`) e **Negociação** (Pregão) existirem + haver registros. Coordenar nomes de campo com Alicerce/Pregão.

---

## 0. O que é o gerador original (resumo técnico)

- Página React client-side. Duas metades: **formulário** (esquerda, `.no-print`) + **documento** vivo de 3 páginas (`.proposal-doc`, A4 **paisagem**).
- Documento = HTML puro estilizado por CSS global com **container queries** (`cqw/cqh`) — portável, quase sem dependência de framework.
- Exporta via **`window.print()`** (print-to-PDF do Chrome). `@page { size: A4 landscape; margin: 0 }`, `.no-print { display:none }`, `break-after: page` por `.pp-page`. Truque: seta `document.title = nome_do_cliente` p/ sugerir nome do arquivo.
- Hidratação: (a) **Bitrix** (`backend/src/routes/bitrix.ts`, deal → campos) OU (b) manual. **No Twenty, Bitrix sai**: os dados vêm dos registros Precatório+Negociação+Cedente.
- Persistência: tabela `proposals` (`backend/src/proposals.ts`, CRUD + histórico). **v1 no Twenty: stateless** (gera PDF na hora, sem salvar). v2 opcional: objeto nativo "Proposta".
- Logo: `frontend/public/precatur-logo-branco.png` (usar na capa; há também `precatur-logo.png` e `precatur-shield.png`).
- Dependências do original a substituir: `shadcn/ui` (Card/Table/Button), `lucide-react`, classes **Tailwind**, `@/lib/utils` (`formatMoney`, `cn`), `@/lib/api`. Twenty NÃO usa Tailwind/shadcn → ver riscos §5.

---

## (a) Onde plugar o botão "Gerar Proposta" na UI do twenty-front

Sistema de ações de registro atual do Twenty = **command-menu-item** (o antigo `RecordActionMenu`/`ActionMenuEntry` não existe mais). Uma ação é: linha declarativa no backend (registry) + componente executor no frontend mapeado por chave de enum. Botão fixado no header do show-page = `isPinned: true`.

**Abordagem recomendada (fork, edição de core — mais simples que o SDK de plugin):**

1. **Enum** — adicionar `GENERATE_PROPOSAL` em
   `packages/twenty-server/src/engine/metadata-modules/command-menu-item/enums/engine-component-key.enum.ts` (`EngineComponentKey`).
2. **Registry backend** — nova entrada em
   `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant.ts`:
   `label: "Gerar Proposta"`, `icon: "IconFileText"`, `isPinned: true`,
   `conditionalAvailabilityExpression: 'pageType == "RECORD_PAGE" and not isInSidePanel'`,
   escopar ao objeto via `availabilityObjectMetadataUniversalIdentifier` (Negociação; opcionalmente também Precatório).
3. **Executor frontend** — componente novo em
   `.../modules/command-menu-item/engine-command/record/single-record/components/GenerateProposalSingleRecordCommand.tsx`.
   Pega `recordId`/objeto via `useHeadlessCommandContextApi()` e navega para a rota da proposta (reusar `HeadlessNavigateEngineCommand` com `to={AppPath.PrecaturProposta}` + query `?negociacaoId=`). Precedente de "gerar documento a partir do registro": `ExportNoteSingleRecordCommand.tsx` + `exportBlockNoteEditorToPdf.ts`.
4. **Registro chave→componente** —
   `packages/twenty-front/src/modules/command-menu-item/engine-command/constants/EngineComponentKeyHeadlessComponentMap.tsx` (`ENGINE_COMPONENT_KEY_COMPONENT_MAP`).
5. **Botão fixado** renderiza via `PinnedCommandMenuItemButtons.tsx` (filtra `isPinned`); header em `pages/object-record/RecordShowPageHeader.tsx`.

⚠️ **Caveat de sync**: ações são linhas persistidas por workspace, seedadas do standard-application. Uma ação de core exige (re)sync da metadata nos workspaces. A rota via **Application manifest** (`CommandMenuItemManifest`/`FrontComponentManifest`, força `engineComponentKey = FRONT_COMPONENT_RENDERER`) sincroniza sozinha e não toca core — **alternativa** se o sync manual incomodar.

**A rota da proposta** (a página-documento em si):

- Adicionar `PrecaturProposta = '/precatur/proposta'` em `packages/twenty-shared/src/types/AppPath.ts`.
- Registrar a `<Route>` em `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx`.
  **Registrar FORA de `MainAppLayoutWithSidePanel`** (ou abrir com `window.open` em nova aba) → a folha impressa não herda navbar/side-panel do CRM e o `@media print` fica limpo. Componente lazy em `packages/twenty-front/src/pages/precatur/PropostaPage.tsx`.

---

## (b) Hidratar dados de Precatório + Negociação + Cedente via API

A ação dispara numa **Negociação** → passa `negociacaoId`. A página busca a Negociação com o Precatório e o Cedente aninhados, usando o Apollo/`useFindOneRecord` do Twenty (não fetch REST). Campos (API names confirmados com Alicerce/Pregão):

| Campo da proposta        | Origem no Twenty                                   | Observação de mapeamento |
|--------------------------|----------------------------------------------------|--------------------------|
| `client_name`            | `negociacao.cedente.name` (Person FULL_NAME) → fallback `precatorio.name` (Título) | `{firstName,lastName}` → juntar |
| `client_doc`             | `negociacao.cpfCnpjCedente` (TEXT)                 | |
| `client_contact`         | `cedente.emails` / `cedente.phones` (composite)    | juntar "tel / email" como no `joinContact` |
| `precatorio_number`      | `precatorio.numeroPrecatorio` (TEXT)               | |
| `tribunal`               | `precatorio.tribunal` (SELECT `TRF/TJ/TRT/STJ/STF`)| mapear value→label |
| `ente_devedor`           | `precatorio.enteDevedor.name` (rel→Company)        | |
| `natureza`               | `precatorio.natureza` (SELECT `ALIMENTAR/COMUM`)   | `ALIMENTAR`→"alimentar" (reusar `naturezaLabel`) |
| `valor_face`             | `precatorio.valorDeFace` (CURRENCY) — ou `valorAtualizado` | **CURRENCY = `{amountMicros, currencyCode}` → `/1e6`** |
| `valor_proposta`         | `negociacao.valorOfertado` (CURRENCY)              | idem amountMicros |
| `desagio`                | `negociacao.desagioPercentual` (NUMBER float)      | ou calcular `1 - proposta/face` |
| `responsavel`/email/tel  | `negociacao.responsavelComercial` (rel→workspaceMember) → fallback usuário logado (`useCurrentWorkspaceMember`) | como o `/me` original |
| `forma_pagamento`/`validade`/`observacoes` | defaults estáticos (texto do original) + `negociacao.observacoes` (RICH_TEXT) | registro interno / rodapé |
| `proposal_number`/`proposal_date` | gerar no cliente (data atual) como no original | |

- Um **único módulo de mapeamento** `precatur/mapNegociacaoToProposta.ts` isola os API names → se Alicerce/Pregão mudarem um nome, muda-se em 1 lugar.
- **Deságio opcional** (`showDesagio`, só p/ advogado): manter checkbox; default oculto.

---

## (c) Reaproveitar template / CSS / window.print

- **Copiar o documento quase 1:1**: o JSX das 3 `<section className="pp-page">` (capa, "como funciona", "sua proposta") é HTML puro → cola direto no `PropostaPage.tsx`. Só troca dados dinâmicos pelos valores hidratados.
- **CSS**: portar o bloco `.proposal-doc` / `.pp-*` / `@media print` de `globals.css` (linhas ~69–387) para um **CSS global escopado à rota** — via `createGlobalStyle`/`injectGlobal` (Linaria/Emotion) montado só quando `PropostaPage` renderiza, **ou** um `.css` importado apenas nessa página. As container queries (`container-type` + `cqw/cqh`) e o `@page A4 landscape` vão como estão. `-webkit-print-color-adjust: exact` já está no bloco.
- **`window.print()`**: reusar a função `printProposal()` (inclui o hack de `document.title = nome_cliente` + listener `afterprint`). Zero dependência de Twenty.
- **Logo**: importar `precatur-logo-branco.png` como asset do bundle (não `/public` do Next); referenciar via `import logo from '.../precatur-logo-branco.png'`.
- **Helpers**: portar `formatMoney`, `num`, `naturezaLabel`, `fmtDate` (triviais). Descartar `cn` se não usarmos classes utilitárias.
- **Botões Gerar PDF / (Salvar)**: manter só "Gerar PDF" em v1 (stateless). Formulário de edição manual = **opcional**; ver risco §5.2.

---

## (d) Riscos e passos

### Riscos
1. **Bloqueio de dados**: Precatório/Negociação e registros de teste ainda não existem (dependem de Alicerce/Pregão + API Key). → Enquanto isso: construir a página com dados **mock** do shape esperado; plugar `useFindOneRecord` só quando houver registro.
2. **Stack incompatível**: original usa Tailwind + shadcn/ui + lucide no **formulário**. Twenty usa Linaria + `twenty-ui` + strict lint (named exports, sem `any`, string-literals). → O **documento** (`.pp-*`) é CSS puro e sobrevive intacto; o **formulário/preview** precisa ser reescrito com `twenty-ui` OU **cortado no v1** (gera direto do registro, sem edição manual). Ícones lucide → `@tabler/icons-react` (já usado no Twenty).
3. **CURRENCY / SELECT / FULL_NAME**: valores compostos do Twenty (amountMicros, enum value, firstName/lastName) exigem transformação — fácil de errar. Centralizar em `mapNegociacaoToProposta.ts` + testes.
4. **Chrome do CRM na impressão**: se a rota herdar o layout com sidebar, o PDF sai sujo. → Registrar rota fora do `MainAppLayoutWithSidePanel` (ou nova aba).
5. **Sync de metadata** da ação de core por workspace (ver caveat §a). Fallback = manifest de Application.
6. **Nomes de campo podem mudar** entre agentes → dependência de coordenação (`maestri ask "Alicerce"/"Pregão"`).

### Passos (ordem)
1. [ ] Confirmar com Alicerce/Pregão os API names finais e que Precatório/Negociação foram criados (usar `precatorio-id.txt` + `pregao-negociacao.md`).
2. [ ] `AppPath.PrecaturProposta` + rota lazy fora do layout principal; `PropostaPage.tsx` com o documento portado + CSS global escopado + logo.
3. [ ] `mapNegociacaoToProposta.ts` (transforms CURRENCY/SELECT/FULL_NAME) + `useFindOneRecord` (com mock enquanto não há dados).
4. [ ] `printProposal()` + botão "Gerar PDF" na página.
5. [ ] Ação `GENERATE_PROPOSAL`: enum + registry backend + executor (`HeadlessNavigateEngineCommand`) + map frontend; `isPinned`, escopada à Negociação.
6. [ ] Sync/seed da metadata da ação no workspace; validar botão no show-page da Negociação.
7. [ ] Testar geração ponta-a-ponta com um registro real; ajustar quebras de página (A4 landscape).
8. [ ] (v2 opcional) objeto nativo "Proposta" p/ histórico/CRUD, substituindo a tabela `proposals`.

### Arquivos-chave de referência (Twenty)
- Ações: `standard-command-menu-item.constant.ts`, `engine-component-key.enum.ts`, `EngineComponentKeyHeadlessComponentMap.tsx`, `PinnedCommandMenuItemButtons.tsx`.
- Executores/plumbing: `HeadlessNavigateEngineCommand.tsx`, `HeadlessEngineCommandWrapperEffect` / `useHeadlessCommandContextApi`, `ExportNoteSingleRecordCommand.tsx`, `exportBlockNoteEditorToPdf.ts`.
- Rotas: `useCreateWorkspaceAppRouter.tsx`, `AppPath.ts`, `getAppPath.ts`.
- Plugin (alternativa): `frontComponentManifestType.ts`, `manifestType.ts`, `FrontComponentRenderer.tsx`.
</content>
</invoke>

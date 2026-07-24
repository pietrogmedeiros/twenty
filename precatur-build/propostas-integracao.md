# Integração do Gerador de Proposta no fork — status

Branch: `feat/precatur-gerador-proposta`. Typecheck ✅ (shared/server/front) · Lint ✅ · Fmt ✅. **Não commitado.**

## Arquivos criados
- `packages/twenty-front/src/pages/precatur/PropostaPage.tsx` — página standalone (preview ao vivo + botão Gerar PDF).
- `packages/twenty-front/src/pages/precatur/components/PropostaDocument.tsx` — documento 3 páginas (JSX portado 1:1).
- `packages/twenty-front/src/pages/precatur/components/PropostaNegociacaoHydrator.tsx` — `useFindOneRecord` da Negociação → mapper.
- `packages/twenty-front/src/pages/precatur/constants/PropostaDocumentStyles.ts` — CSS `.proposal-doc/.pp-*/@media print` 1:1.
- `packages/twenty-front/src/pages/precatur/utils/mapNegociacaoToProposta.ts` — transforms CURRENCY/SELECT/FULL_NAME + mock.
- `packages/twenty-front/src/pages/precatur/assets/precatur-logo-branco.png` — logo (asset importado).
- `packages/twenty-front/src/modules/command-menu-item/engine-command/record/single-record/components/GenerateProposalSingleRecordCommand.tsx` — executor da ação.

## Arquivos alterados
- `packages/twenty-shared/src/types/AppPath.ts` — `PrecaturProposta = '/precatur/proposta'`.
- `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx` — rota fora do `MainAppLayoutWithSidePanel` (sob `DefaultLayout`, que já esconde a nav no `@media print`).
- `packages/twenty-front/src/modules/command-menu-item/engine-command/constants/EngineComponentKeyHeadlessComponentMap.tsx` — `GENERATE_PROPOSAL → <GenerateProposalSingleRecordCommand/>`.
- `packages/twenty-front/src/generated-metadata/graphql.ts` — enum `EngineComponentKey.GENERATE_PROPOSAL` (idempotente com `graphql:generate`).
- `packages/twenty-server/.../engine-component-key.enum.ts` — `GENERATE_PROPOSAL`.
- `packages/twenty-server/.../standard-command-menu-item.constant.ts` — entrada `generateProposal` (pinned, escopada a `nameSingular == "negociacao"`).

## Como funciona hoje
- Rota `/precatur/proposta` funciona standalone: renderiza o preview ao vivo e imprime (window.print, A4 paisagem). Sem `?negociacaoId=` ou sem o objeto Negociação → usa mock (precatório fictício).
- Com `?negociacaoId=<id>` e objeto Negociação existente → hidrata Precatório+Cedente via API e mapeia.
- A ação "Gerar Proposta" (botão fixado) navega para a rota com `?negociacaoId=<id do registro>`.

## ⚠️ 2 passos de core-sync pendentes (não bloqueiam o resto)
1. **Seeding da ação em workspace existente.** `STANDARD_COMMAND_MENU_ITEMS` é semeado automaticamente em workspaces **novos/resetados**. Para um workspace **já existente**, criar um workspace-command de upgrade que insere a linha `generateProposal` (padrão em `src/database/commands/upgrade-version-command/*`). Alternativa rápida em dev: `npx nx database:reset twenty-server`.
2. **`graphql:generate`.** Já adicionei `GENERATE_PROPOSAL` ao `generated-metadata/graphql.ts` à mão (idempotente). Ao rodar `npx nx run twenty-front:graphql:generate --configuration=metadata` com o server no ar, o valor é reproduzido igual — nada a fazer, só confirmar.

## Dependências externas
- Objetos **Precatório** e **Negociação** precisam existir com os campos de `alicerce-metodo.md` / `pregao-negociacao.md`. Enquanto não existirem, a página usa mock (sem erro). Confirmar os API names finais com Alicerce/Pregão quando os objetos forem criados.

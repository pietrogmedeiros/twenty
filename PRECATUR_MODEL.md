# Modelo de dados Precatur (Twenty CRM self-hosted)

Instância: Docker, http://localhost:3000, repo `~/twenty`.
Construção via **API de metadados do Twenty** (GraphQL, endpoint `/metadata`) usando uma **API Key** de Settings → APIs & Webhooks. O Maestro (Clone) fornece a key quando disponível. Enquanto a key não chega, cada agente PREPARA seu script de mutations e o passo-a-passo, sem executar.

## Princípio
1 workspace. Objeto central **Precatório** + 1 objeto por setor ligado por **relação** (Precatório 1 → N por setor). A relação é o que faz os setores "conversarem": de dentro de um Precatório vê-se as abas de cada setor.

```
                    PRECATÓRIO (central — dono: Alicerce)
        ┌──────────────┬───────────┬──────────────┐
   Negociação    Análise Jurídica  Processo Admin.  Pagamento
   (Pregão)          (Toga)          (Carimbo)       (Cofre)
```

## OBJETO CENTRAL: Precatório  (dono: Alicerce)
Título(texto), Nº precatório, Nº processo originário, Tribunal(seleção: TRF/TJ/TRT/STJ/STF), Ente devedor(relação→Company — é o GOVERNO devedor: União/Estado/Município), Natureza(Alimentar/Comum), Ano orçamentário(número), Valor de face(moeda), Valor atualizado(moeda), Data-base(data), Cedente(relação→Person — SEMPRE pessoa física, negócio é B2C, nunca empresa), Advogado(relação→Person), **Fase geral**(seleção: Prospecção→Comercial→Jurídico→Administrativo→Financeiro→Concluído/Descartado), Responsável(relação→Membro).

## Negociação (Comercial) — dono: Pregão
Precatório(rel→Precatório), Cedente(rel→Person — SEMPRE pessoa física, B2C, sem empresa na negociação), Canal/origem(seleção), Valor ofertado(moeda), Deságio %(número), Status(seleção: Prospecção/Contato feito/Proposta enviada/Em negociação/Aceito/Recusado/Fechado), Data proposta(data), Data fechamento(data), Responsável comercial(rel→membro), Observações(texto longo).

## Análise Jurídica (Jurídico) — dono: Toga
Precatório(rel), Status(Pendente/Em análise/Aprovado/Reprovado/Com ressalvas), Risco(Baixo/Médio/Alto), Tem penhora/bloqueio(booleano), Cessões anteriores(booleano), Retenção IR/contrib(moeda), Honorários destacados(moeda), Valor líquido estimado(moeda), Contrato cessão(Não/Em elaboração/Assinado), Parecer jurídico(texto longo), Advogado responsável(rel→membro), Data análise(data).

## Processo Administrativo (Administrativo) — dono: Carimbo
Precatório(rel), Status(A protocolar/Protocolado/Em habilitação/Habilitado/Pendência documental/Concluído), Nº protocolo(texto), Órgão de protocolo(seleção), Data protocolo(data), Documentos pendentes(texto), Cartório/registro(texto), Ofício requisitório(data), Responsável administrativo(rel→membro), Observações(texto longo).

## Pagamento (Financeiro) — dono: Cofre
Precatório(rel), Tipo(Pagamento ao cedente/Recebimento do ente), Status(Previsto/Agendado/Pago/Recebido/Conciliado/Atrasado), Valor(moeda), Data prevista(data), Data efetiva(data), Forma de pagamento(seleção), Impostos/retenções(moeda), Comprovante(anexo), Responsável financeiro(rel→membro), Observações(texto longo).

## Views por setor
- Precatório: tabela geral + Kanban por Fase geral (dono: Alicerce)
- Comercial: Kanban de Negociação por Status
- Jurídico: Kanban de Análise por Status (agrupar por Risco)
- Administrativo: Kanban de Processo por Status
- Financeiro: tabela de Pagamento (agrupar por Data prevista) + Kanban por Status

## Campos EXTRAS aprovados (adicionar todos)
- Negociação (Comercial): CPF/CNPJ do cedente (texto), Valor de aquisição real (moeda), Margem/lucro esperado (moeda ou %).
- Análise Jurídica: Trânsito em julgado/recurso pendente (seleção: Transitado/Recurso pendente/Indefinido), Vara/Comarca de origem (texto).
- Processo Administrativo: Nº do ofício requisitório (texto), Situação na fila cronológica (texto/número), Exercício de pagamento (número — ano de quitação).
- Pagamento (Financeiro): Valor de aquisição (moeda), Deságio efetivo % (número), Dados bancários do cedente (texto: banco/agência/conta ou PIX).

## Campos dos pipelines — lista do cliente (criados em 15/09/2026, 59 campos)
Criados via `precatur-build/criar-campos-pipelines.mjs`. Anexos/documentos são **TEXT** (o arquivo físico vai na aba Attachments do registro) — FIELD tipo FILES não é criável via API em custom object. Registro da execução: `precatur-build/SESSAO-2026-09-15.md`.

- **Negociação (22)**: resposta, aceite(bool), cessionario, certidaoCasamentoNascimento*, comprovanteResidencia*, confirmacaoDiretorComercial(bool), consideracoes(rich), contraProposta($), dadosBancarios, enteDevedor, identidadeCnh*, informativoCessao*, nomeCedente, numeroPrecatorio, numeroProcesso, percentualDesembolso(float 2), propostaInicial($), telefone, valorOficio($), valorCedente($), valorComissao($), valorDesembolso($).
- **Análise Jurídica (26)**: anexoCalculoAtualizado*, anexoCalculosHomologados*, anexoCalculosPreAnalise*, anexoOficio*, anexoPrecatorio*, anexoProcesso*, anexoSentencaAcordao*, anoOrcamentario(int), calculoAtualizadoValor($), certidoesNegativas{Estaduais, JusticaEstadual1Grau, JusticaEstadual2Grau, JusticaFederalUnificada, Municipais, Trabalhistas, Uniao}*, contratoHonorarios*, decisaoHomologatoria*, honorariosContratuaisPercentual(float 2), natureza(SELECT Alimentar/Comum), numeroOficio, observacoesPreAnalise(rich), pendenciasProvidenciar(rich), previsaoPagamentoAno(int), protocolo, regime.
- **Processo Administrativo (9)**: minutaContratoParticular*, minutaEscrituraPublica*, peticaoHomologacao*, paperPagamento*, aprovacaoComercial(bool), aprovacaoJuridica(bool), aprovacaoAdministrativa(bool), autorizacaoResponsavelAdmFinanceiro, autorizacaoResponsavelJuridico.
- **Pagamento (2)**: contratoParticularAssinado*, trasladoEscritura*.

`*` = campo de anexo (TEXT + descrição apontando para a aba Attachments).

**Não criados por já existirem (confirmado pelo dono em 15/09)**: "Origem do Lead"→`canalOrigem` e "CNPJ/CPF"/"CPF"→`cpfCnpjCedente` (Negociação); "Parecer Jurídico"→`parecerJuridico` (Análise); "Comprovante de Pagamento"→`comprovante` (Pagamento).

**Interpretações confirmadas pelo dono em 15/09**: `resposta` = campo literal "3. Resposta" do formulário; "Aprovações (Comercial, Jurídico, Administrativo)" = 3 BOOLEANs no Processo Administrativo; as 2 "Autorização - Responsável…" ficam TEXT (podem virar relação→membro depois); "Contrato Honorários" = anexo.

## PERMISSÕES — decisão do dono: TRAVAR POR SETOR desde o início (dono: Alicerce)
Criar 4 roles no Twenty: Comercial, Jurídico, Administrativo, Financeiro.
- Cada role EDITA apenas o seu objeto; LÊ o Precatório central; LÊ (read-only) os demais objetos-setor.
- Admin (dono da conta) mantém acesso total.
- Alicerce: verificar se roles/permissões por objeto são configuráveis via API de metadados ou se é passo manual na UI (Settings > Roles). Preparar o passo a passo em qualquer caso.

## Reaproveitar objetos nativos
Companies = entes devedores / escritórios. People = cedentes / advogados. Notes/Tasks = pendências.

## Ordem de construção (dependências!)
1. **Alicerce** cria o objeto Precatório + campos, e valida o acesso à API de metadados. AVISA os setores quando o Precatório existir.
2. Cada setor cria SEU objeto + campos, e a **relação many-to-one do seu objeto → Precatório** (só depois do passo 1).
3. Cada setor cria suas views. Alicerce revisa/integra e cria o Kanban de Fase geral.

## Colaboração (Maestri)
Rode `maestri list` para ver seus colegas. O integrador é **Alicerce**. Coordene com `maestri ask "Alicerce" "..."`. Leia sempre este arquivo (`~/twenty/PRECATUR_MODEL.md`) como fonte-de-verdade antes de começar.

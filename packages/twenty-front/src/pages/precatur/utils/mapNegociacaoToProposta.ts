import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isDefined } from 'twenty-shared/utils';

// Dados que o documento da proposta renderiza (equivalente ao estado do gerador
// original). Só os campos que aparecem no PDF de 3 páginas.
export type ProposalData = {
  clientName: string;
  proposalDate: string;
  validade: string;
  naturezaLabel: string;
  valorFace: number;
  valorProposta: number;
  desagioPercent: number;
  showDesagio: boolean;
  responsavelEmail: string;
  responsavelPhone: string;
};

// Rótulos dos SELECT (value MAIÚSCULO no metadata → label legível no documento).
// Coordenado com Alicerce/Pregão (ver ~/twenty/precatur-build/{alicerce-metodo,pregao-negociacao}.md).
const NATUREZA_LABELS: Record<string, string> = {
  ALIMENTAR: 'Alimentar',
  COMUM: 'Comum',
};

// CURRENCY no Twenty = { amountMicros, currencyCode }. amountMicros / 1e6 → reais.
const currencyToNumber = (value: unknown): number => {
  const amountMicros = (value as { amountMicros?: number | null } | null)
    ?.amountMicros;

  return isDefined(amountMicros) ? amountMicros / 1_000_000 : 0;
};

// FULL_NAME = { firstName, lastName } → "First Last".
const fullNameToString = (value: unknown): string => {
  const fullName = value as
    | { firstName?: string | null; lastName?: string | null }
    | null
    | undefined;

  return [fullName?.firstName, fullName?.lastName]
    .filter(isDefined)
    .join(' ')
    .trim();
};

const selectLabel = (
  value: unknown,
  labels: Record<string, string>,
): string => {
  if (typeof value !== 'string' || value === '') {
    return '—';
  }

  return labels[value] ?? value;
};

// Dados de exemplo (precatório fictício) — usados quando não há negociacaoId ou o
// objeto Negociação ainda não existe no workspace. Espelham o preview aprovado.
export const MOCK_PROPOSAL_DATA: ProposalData = {
  clientName: 'Maria Aparecida de Souza',
  proposalDate: new Date().toLocaleDateString('pt-BR'),
  validade: '10 dias corridos a partir da data de emissão.',
  naturezaLabel: 'Alimentar',
  valorFace: 171861.96,
  valorProposta: 122881,
  desagioPercent: 28.5,
  showDesagio: true,
  responsavelEmail: 'comercial@precatur.com.br',
  responsavelPhone: '(27) 99999-0000',
};

// Hidrata os dados da proposta a partir de uma Negociação (com Precatório e
// Cedente aninhados, profundidade 1). Campos ausentes caem para o mock.
export const mapNegociacaoToProposta = (
  negociacao: ObjectRecord | undefined,
): ProposalData => {
  if (!isDefined(negociacao)) {
    return MOCK_PROPOSAL_DATA;
  }

  const precatorio = negociacao.precatorio as ObjectRecord | undefined;
  const cedente = negociacao.cedente as ObjectRecord | undefined;
  // Responsável comercial (workspaceMember) — fonte do contato no rodapé (CTA).
  const responsavel = negociacao.responsavelComercial as
    | { userEmail?: string | null }
    | undefined;

  const valorFace = currencyToNumber(precatorio?.valorDeFace);
  const valorProposta = currencyToNumber(negociacao.valorOfertado);

  // Deságio: usa o campo da Negociação; se ausente, deriva de face/proposta.
  const desagioField = negociacao.desagioPercentual;
  const desagioPercent = isDefined(desagioField)
    ? Number(desagioField)
    : valorFace > 0
      ? (1 - valorProposta / valorFace) * 100
      : 0;

  const clientName =
    fullNameToString(cedente?.name) ||
    (typeof precatorio?.name === 'string' ? precatorio.name : '') ||
    (typeof negociacao.name === 'string' ? negociacao.name : '') ||
    MOCK_PROPOSAL_DATA.clientName;

  return {
    clientName,
    proposalDate: new Date().toLocaleDateString('pt-BR'),
    validade: MOCK_PROPOSAL_DATA.validade,
    naturezaLabel: selectLabel(precatorio?.natureza, NATUREZA_LABELS),
    valorFace,
    valorProposta,
    desagioPercent,
    showDesagio: valorFace > 0 && valorProposta > 0,
    responsavelEmail:
      (typeof responsavel?.userEmail === 'string' && responsavel.userEmail) ||
      MOCK_PROPOSAL_DATA.responsavelEmail,
    // workspaceMember não tem telefone padrão → usa o contato institucional.
    responsavelPhone: MOCK_PROPOSAL_DATA.responsavelPhone,
  };
};

// Formata reais no padrão pt-BR (equivalente ao formatMoney do gerador original).
export const formatProposalMoney = (value: number): string =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

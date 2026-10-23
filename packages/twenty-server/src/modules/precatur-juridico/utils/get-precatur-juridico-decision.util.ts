import {
  PRECATUR_JURIDICO_ANALYSIS_STATUS,
  PRECATUR_JURIDICO_DECISION,
  type PrecaturJuridicoDecision,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';

// Status da Análise Jurídica → decisão mostrada no card do negócio.
// Qualquer status sem decisão (Pendente, Em análise…) conta como aguardando.
export const getPrecaturJuridicoDecision = (
  analysisStatus: string | null | undefined,
): PrecaturJuridicoDecision => {
  switch (analysisStatus) {
    case PRECATUR_JURIDICO_ANALYSIS_STATUS.APPROVED:
      return PRECATUR_JURIDICO_DECISION.APPROVED;
    case PRECATUR_JURIDICO_ANALYSIS_STATUS.APPROVED_WITH_CAVEATS:
      return PRECATUR_JURIDICO_DECISION.APPROVED_WITH_CAVEATS;
    case PRECATUR_JURIDICO_ANALYSIS_STATUS.REJECTED:
      return PRECATUR_JURIDICO_DECISION.REJECTED;
    default:
      return PRECATUR_JURIDICO_DECISION.WAITING;
  }
};

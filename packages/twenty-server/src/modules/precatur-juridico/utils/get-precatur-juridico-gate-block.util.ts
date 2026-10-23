import { isDefined } from 'twenty-shared/utils';

import {
  PRECATUR_JURIDICO_DEAL_REJECTED_STAGE_VALUE,
  PRECATUR_JURIDICO_DEAL_STAGE_VALUE,
  PRECATUR_JURIDICO_DECISION,
  type PrecaturJuridicoDecision,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';

type StageOption = { value: string; position: number };

export type PrecaturJuridicoGateBlock = 'WAITING_DECISION' | 'REJECTED';

// Bloqueia passar da etapa "Jurídico" (saindo dela ou pulando por cima) sem
// análise aprovada. Voltar, ficar e ir para "Recusado" são sempre permitidos;
// negócio que já estava depois do Jurídico não é afetado.
export const getPrecaturJuridicoGateBlock = ({
  stageOptions,
  currentStage,
  targetStage,
  decision,
}: {
  stageOptions: StageOption[];
  currentStage: string | null;
  targetStage: string;
  decision: PrecaturJuridicoDecision | null;
}): PrecaturJuridicoGateBlock | null => {
  if (targetStage === PRECATUR_JURIDICO_DEAL_REJECTED_STAGE_VALUE) {
    return null;
  }

  const positionOf = (value: string | null) =>
    stageOptions.find((option) => option.value === value)?.position;

  const juridicoPosition = positionOf(PRECATUR_JURIDICO_DEAL_STAGE_VALUE);
  const targetPosition = positionOf(targetStage);

  if (!isDefined(juridicoPosition) || !isDefined(targetPosition)) {
    return null;
  }

  const currentPosition = positionOf(currentStage) ?? -Infinity;

  if (
    targetPosition <= juridicoPosition ||
    currentPosition > juridicoPosition
  ) {
    return null;
  }

  if (
    decision === PRECATUR_JURIDICO_DECISION.APPROVED ||
    decision === PRECATUR_JURIDICO_DECISION.APPROVED_WITH_CAVEATS
  ) {
    return null;
  }

  return decision === PRECATUR_JURIDICO_DECISION.REJECTED
    ? 'REJECTED'
    : 'WAITING_DECISION';
};

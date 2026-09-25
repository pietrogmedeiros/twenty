import {
  PRECATUR_FOLLOW_UP_CALL_TASK_AFTER_DAYS,
  PRECATUR_FOLLOW_UP_DAYS,
} from 'src/modules/precatur-follow-up/constants/precatur-follow-up.constants';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Quando acontece o próximo passo depois de `sentCount` follow-ups enviados:
// o próximo follow-up (contado da entrada na etapa) ou, depois do último, a
// tarefa de ligar.
export const computePrecaturFollowUpNextAt = ({
  enteredStageAt,
  sentCount,
}: {
  enteredStageAt: Date;
  sentCount: number;
}): Date => {
  const nextFollowUpDay = PRECATUR_FOLLOW_UP_DAYS[sentCount];

  const dayOffset =
    nextFollowUpDay ??
    PRECATUR_FOLLOW_UP_DAYS[PRECATUR_FOLLOW_UP_DAYS.length - 1] +
      PRECATUR_FOLLOW_UP_CALL_TASK_AFTER_DAYS;

  return new Date(enteredStageAt.getTime() + dayOffset * DAY_IN_MS);
};

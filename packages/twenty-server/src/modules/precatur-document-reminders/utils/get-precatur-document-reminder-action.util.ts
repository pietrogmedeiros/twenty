export type PrecaturDocumentReminderAction =
  | 'REMIND'
  | 'ESCALATE'
  | 'RESOLVE'
  | 'CLOSE'
  | 'WAIT';

// O cron só roda em dia útil, então cada execução conta um dia útil
export const getPrecaturDocumentReminderAction = ({
  isStopped,
  missingCount,
  sentCount,
  lastSentOn,
  today,
  maxReminders,
}: {
  isStopped: boolean;
  missingCount: number;
  sentCount: number;
  lastSentOn: string | null;
  today: string;
  maxReminders: number;
}): PrecaturDocumentReminderAction => {
  if (missingCount === 0) {
    return 'RESOLVE';
  }

  if (isStopped) {
    return 'CLOSE';
  }

  if (lastSentOn?.slice(0, 10) === today) {
    return 'WAIT';
  }

  return sentCount < maxReminders ? 'REMIND' : 'ESCALATE';
};

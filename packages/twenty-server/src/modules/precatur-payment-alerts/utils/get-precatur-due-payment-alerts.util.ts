import { PRECATUR_PAYMENT_ALERT_MILESTONES } from 'src/modules/precatur-payment-alerts/constants/precatur-payment-alerts.constants';

type Milestone = (typeof PRECATUR_PAYMENT_ALERT_MILESTONES)[number];

// "YYYY-MM-DD" menos N meses, sem fuso (campo DATE)
const subtractMonths = (isoDate: string, months: number): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const lastDayOfMonth = new Date(
    Date.UTC(targetYear, targetMonth, 0),
  ).getUTCDate();

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(
    Math.min(day, lastDayOfMonth),
  ).padStart(2, '0')}`;
};

// Marcos vencidos e ainda não avisados. Quando o card chega tarde (ex.: a 2
// meses do pagamento), avisa só o marco mais próximo e marca os anteriores,
// para não criar três tarefas no mesmo dia.
export const getPrecaturDuePaymentAlerts = ({
  expectedPaymentDate,
  sentAlerts,
  today,
}: {
  expectedPaymentDate: string;
  sentAlerts: string[];
  today: string;
}): { alertToNotify: Milestone | null; alertsToMark: Milestone[] } => {
  if (today.slice(0, 10) > expectedPaymentDate.slice(0, 10)) {
    return { alertToNotify: null, alertsToMark: [] };
  }

  const alertsToMark = PRECATUR_PAYMENT_ALERT_MILESTONES.filter(
    (milestone) =>
      !sentAlerts.includes(milestone.value) &&
      subtractMonths(expectedPaymentDate, milestone.months) <=
        today.slice(0, 10),
  );

  return {
    alertToNotify:
      alertsToMark.length > 0 ? alertsToMark[alertsToMark.length - 1] : null,
    alertsToMark,
  };
};

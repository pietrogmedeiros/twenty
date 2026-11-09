import { getPrecaturDuePaymentAlerts } from 'src/modules/precatur-payment-alerts/utils/get-precatur-due-payment-alerts.util';

const values = (milestones: { value: string }[]) =>
  milestones.map((milestone) => milestone.value);

describe('getPrecaturDuePaymentAlerts', () => {
  it('should not alert before 6 months', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-07-15',
      sentAlerts: [],
      today: '2027-01-14',
    });

    expect(result.alertToNotify).toBeNull();
  });

  it('should alert 6 months on the exact day', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-07-15',
      sentAlerts: [],
      today: '2027-01-15',
    });

    expect(result.alertToNotify?.value).toBe('SEIS_MESES');
    expect(values(result.alertsToMark)).toEqual(['SEIS_MESES']);
  });

  it('should only notify the closest milestone when the card arrives late', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-07-15',
      sentAlerts: [],
      today: '2027-05-01',
    });

    expect(result.alertToNotify?.value).toBe('TRES_MESES');
    expect(values(result.alertsToMark)).toEqual(['SEIS_MESES', 'TRES_MESES']);
  });

  it('should skip milestones already sent', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-07-15',
      sentAlerts: ['SEIS_MESES', 'TRES_MESES'],
      today: '2027-05-01',
    });

    expect(result.alertToNotify).toBeNull();
  });

  it('should clamp month end (31/03 minus 1 month = 28/02)', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-03-31',
      sentAlerts: ['SEIS_MESES', 'TRES_MESES'],
      today: '2027-02-28',
    });

    expect(result.alertToNotify?.value).toBe('UM_MES');
  });

  it('should stop alerting after the payment date', () => {
    const result = getPrecaturDuePaymentAlerts({
      expectedPaymentDate: '2027-03-31',
      sentAlerts: [],
      today: '2027-04-01',
    });

    expect(result.alertToNotify).toBeNull();
  });
});

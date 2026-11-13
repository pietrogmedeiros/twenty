import { getPrecaturDocumentReminderAction } from 'src/modules/precatur-document-reminders/utils/get-precatur-document-reminder-action.util';

const base = {
  isStopped: false,
  missingCount: 2,
  sentCount: 0,
  lastSentOn: null,
  today: '2026-11-10',
  maxReminders: 5,
};

describe('getPrecaturDocumentReminderAction', () => {
  it('should remind on the first business day', () => {
    expect(getPrecaturDocumentReminderAction(base)).toBe('REMIND');
  });

  it('should not remind twice on the same day', () => {
    expect(
      getPrecaturDocumentReminderAction({
        ...base,
        sentCount: 1,
        lastSentOn: '2026-11-10',
      }),
    ).toBe('WAIT');
  });

  it('should escalate after 5 reminders', () => {
    expect(
      getPrecaturDocumentReminderAction({
        ...base,
        sentCount: 5,
        lastSentOn: '2026-11-09',
      }),
    ).toBe('ESCALATE');
  });

  it('should resolve when nothing is missing', () => {
    expect(
      getPrecaturDocumentReminderAction({ ...base, missingCount: 0 }),
    ).toBe('RESOLVE');
  });

  it('should close when the analysis was rejected with documents missing', () => {
    expect(
      getPrecaturDocumentReminderAction({ ...base, isStopped: true }),
    ).toBe('CLOSE');
  });
});

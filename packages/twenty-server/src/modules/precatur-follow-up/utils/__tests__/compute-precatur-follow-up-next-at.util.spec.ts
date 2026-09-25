import { computePrecaturFollowUpNextAt } from 'src/modules/precatur-follow-up/utils/compute-precatur-follow-up-next-at.util';

describe('computePrecaturFollowUpNextAt', () => {
  const enteredStageAt = new Date('2026-09-25T12:00:00.000Z');

  it('should schedule follow-ups on days 1, 3 and 7 after entering the stage', () => {
    expect(
      computePrecaturFollowUpNextAt({ enteredStageAt, sentCount: 0 }),
    ).toEqual(new Date('2026-09-26T12:00:00.000Z'));
    expect(
      computePrecaturFollowUpNextAt({ enteredStageAt, sentCount: 1 }),
    ).toEqual(new Date('2026-09-28T12:00:00.000Z'));
    expect(
      computePrecaturFollowUpNextAt({ enteredStageAt, sentCount: 2 }),
    ).toEqual(new Date('2026-10-02T12:00:00.000Z'));
  });

  it('should schedule the call task two days after the last follow-up', () => {
    expect(
      computePrecaturFollowUpNextAt({ enteredStageAt, sentCount: 3 }),
    ).toEqual(new Date('2026-10-04T12:00:00.000Z'));
  });
});

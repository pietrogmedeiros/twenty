import { formatPrecaturCallDuration } from '@/precatur-call/utils/formatPrecaturCallDuration';

describe('formatPrecaturCallDuration', () => {
  it('should pad minutes and seconds', () => {
    expect(formatPrecaturCallDuration(0)).toBe('00:00');
    expect(formatPrecaturCallDuration(7)).toBe('00:07');
    expect(formatPrecaturCallDuration(83)).toBe('01:23');
  });

  it('should keep counting minutes past one hour', () => {
    expect(formatPrecaturCallDuration(3725)).toBe('62:05');
  });
});

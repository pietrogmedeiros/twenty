import {
  getPrecaturPhoneMatchKey,
  toPrecaturE164Phone,
} from 'src/modules/precatur-follow-up/utils/normalize-precatur-phone.util';

describe('toPrecaturE164Phone', () => {
  it('should add the Brazil calling code to national numbers', () => {
    expect(toPrecaturE164Phone('33 9984-5173')).toBe('+553399845173');
    expect(toPrecaturE164Phone('(71) 99999-1234')).toBe('+5571999991234');
  });

  it('should keep numbers that already have a calling code', () => {
    expect(toPrecaturE164Phone('+55 71 99999-1234')).toBe('+5571999991234');
  });

  it('should return null for empty values', () => {
    expect(toPrecaturE164Phone('')).toBeNull();
    expect(toPrecaturE164Phone(null)).toBeNull();
  });
});

describe('getPrecaturPhoneMatchKey', () => {
  it('should match Brazilian mobiles with and without the ninth digit', () => {
    expect(getPrecaturPhoneMatchKey('+55 71 99999-1234')).toBe(
      getPrecaturPhoneMatchKey('557199991234'),
    );
  });

  it('should not match different area codes', () => {
    expect(getPrecaturPhoneMatchKey('+5571999991234')).not.toBe(
      getPrecaturPhoneMatchKey('+5511999991234'),
    );
  });
});

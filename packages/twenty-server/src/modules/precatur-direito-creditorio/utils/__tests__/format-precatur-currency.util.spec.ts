import { formatPrecaturCurrency } from 'src/modules/precatur-direito-creditorio/utils/format-precatur-currency.util';

describe('formatPrecaturCurrency', () => {
  it('should format micros as BRL', () => {
    expect(
      formatPrecaturCurrency({
        amountMicros: 1234560000,
        currencyCode: 'BRL',
      })?.replace(/\s/g, ' '),
    ).toBe('R$ 1.234,56');
  });

  it('should return null without an amount', () => {
    expect(formatPrecaturCurrency(null)).toBeNull();
    expect(
      formatPrecaturCurrency({ amountMicros: null, currencyCode: 'BRL' }),
    ).toBeNull();
  });
});

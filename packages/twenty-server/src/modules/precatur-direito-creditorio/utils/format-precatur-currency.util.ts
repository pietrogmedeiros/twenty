import { isDefined } from 'twenty-shared/utils';

export type PrecaturCurrencyValue = {
  amountMicros?: number | string | null;
  currencyCode?: string | null;
} | null;

export const hasPrecaturCurrencyAmount = (
  value: PrecaturCurrencyValue | undefined,
): value is NonNullable<PrecaturCurrencyValue> =>
  isDefined(value) &&
  isDefined(value.amountMicros) &&
  Number(value.amountMicros) > 0;

// R$ 1.234,56 (amountMicros = valor × 1.000.000)
export const formatPrecaturCurrency = (
  value: PrecaturCurrencyValue | undefined,
) => {
  if (!hasPrecaturCurrencyAmount(value)) {
    return null;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: value.currencyCode || 'BRL',
  }).format(Number(value.amountMicros) / 1_000_000);
};

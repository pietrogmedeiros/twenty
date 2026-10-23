import {
  PRECATUR_JURIDICO_PAYMENT_PAID_STATUSES,
  PRECATUR_JURIDICO_PAYMENT_TO_ASSIGNOR_TYPE,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import { type PrecaturJuridicoPayment } from 'src/modules/precatur-juridico/types/precatur-juridico.types';

export const isPrecaturJuridicoPaidToAssignor = (
  payment: Pick<PrecaturJuridicoPayment, 'tipo' | 'status'> | null | undefined,
) =>
  payment?.tipo === PRECATUR_JURIDICO_PAYMENT_TO_ASSIGNOR_TYPE &&
  PRECATUR_JURIDICO_PAYMENT_PAID_STATUSES.includes(payment.status ?? '');

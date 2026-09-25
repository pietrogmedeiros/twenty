import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

type PrecaturCallPhones = {
  primaryPhoneNumber?: string | null;
  primaryPhoneCallingCode?: string | null;
} | null;

type PrecaturCallPhoneSource = {
  telefone?: string | null;
  cedente?: { phones?: PrecaturCallPhones } | null;
};

// O telefone do negócio vem primeiro (é o contato da negociação); sem ele,
// usa o telefone principal do Cedente vinculado.
export const getPrecaturCallPhoneNumber = (
  record: PrecaturCallPhoneSource | null | undefined,
): string => {
  const recordPhone = record?.telefone?.trim();

  if (isNonEmptyString(recordPhone)) {
    return recordPhone;
  }

  const cedentePhones = record?.cedente?.phones;
  const cedenteNumber = cedentePhones?.primaryPhoneNumber?.trim();

  if (!isDefined(cedentePhones) || !isNonEmptyString(cedenteNumber)) {
    return '';
  }

  const callingCode = cedentePhones.primaryPhoneCallingCode?.trim();

  return isNonEmptyString(callingCode)
    ? `${callingCode} ${cedenteNumber}`
    : cedenteNumber;
};

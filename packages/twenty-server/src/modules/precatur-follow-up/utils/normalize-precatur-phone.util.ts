import { isNonEmptyString } from '@sniptt/guards';

// Telefone em E.164 (+55...). Números brasileiros sem DDI (10 ou 11 dígitos)
// ganham o 55, que é como o Chatwoot guarda os contatos do WhatsApp.
export const toPrecaturE164Phone = (phone: string | null | undefined) => {
  const digits = (phone ?? '').replace(/\D/g, '');

  if (!isNonEmptyString(digits)) {
    return null;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return `+${digits}`;
};

// Chave para comparar telefones brasileiros ignorando o 9º dígito: o WhatsApp
// às vezes entrega o número sem ele (DDD + 8 dígitos) e o cadastro tem com ele.
export const getPrecaturPhoneMatchKey = (phone: string | null | undefined) => {
  const e164 = toPrecaturE164Phone(phone);

  if (e164 === null) {
    return null;
  }

  const digits = e164.slice(1);

  if (!digits.startsWith('55')) {
    return digits;
  }

  const national = digits.slice(2);
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);

  return `55${areaCode}${subscriber.slice(-8)}`;
};

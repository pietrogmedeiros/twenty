const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

// "Terça-feira, 11 de agosto", como o separador de dias do Bitrix
export const formatPrecaturChatDay = (date: Date) =>
  capitalize(
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );

export const formatPrecaturChatTime = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Na lista de conversas: hora se for hoje, senão "17 de set"
export const formatPrecaturChatListDate = (date: Date) => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return formatPrecaturChatTime(date);
  }

  return date
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    .replace('.', '');
};

export const getPrecaturChatDayKey = (date: Date) => date.toDateString();

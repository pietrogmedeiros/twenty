export type PrecaturChatMessageBodyPart =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'link'; value: string };

const URL_REGEX = /https?:\/\/[^\s]+/g;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitLinks = (text: string): PrecaturChatMessageBodyPart[] => {
  const parts: PrecaturChatMessageBodyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    parts.push({ type: 'link', value: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
};

// Realça "@Nome Sobrenome" só das pessoas realmente mencionadas na mensagem
export const splitPrecaturChatMessageBody = (
  body: string,
  mentionedNames: string[],
): PrecaturChatMessageBodyPart[] => {
  const names = mentionedNames
    .filter((name) => name.length > 0)
    .sort((nameA, nameB) => nameB.length - nameA.length);

  if (names.length === 0) {
    return splitLinks(body);
  }

  const mentionRegex = new RegExp(
    `@(${names.map(escapeRegExp).join('|')})`,
    'g',
  );

  const parts: PrecaturChatMessageBodyPart[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(mentionRegex)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(...splitLinks(body.slice(lastIndex, index)));
    }
    parts.push({ type: 'mention', value: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(...splitLinks(body.slice(lastIndex)));
  }

  return parts;
};

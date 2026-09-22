// Detecta "@texto" imediatamente antes do cursor para abrir a lista de pessoas
const MENTION_QUERY_REGEX = /(^|\s)@([\p{L}\p{N}._-]*)$/u;

export const getPrecaturChatMentionQuery = (textBeforeCaret: string) => {
  const match = MENTION_QUERY_REGEX.exec(textBeforeCaret);

  if (match === null) {
    return null;
  }

  const query = match[2];

  return {
    query,
    startIndex: textBeforeCaret.length - query.length - 1,
  };
};

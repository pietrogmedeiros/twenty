import { getPrecaturChatMemberName } from '@/precatur-chat/utils/getPrecaturChatMemberName';
import { getPrecaturChatMentionQuery } from '@/precatur-chat/utils/getPrecaturChatMentionQuery';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

const MAX_MENTION_OPTIONS = 8;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Estado do autocomplete de "@": qual trecho está sendo digitado e quem sugerir
export const usePrecaturChatMentions = (
  workspaceMembers: PartialWorkspaceMember[],
) => {
  const [mentionQuery, setMentionQuery] = useState<{
    query: string;
    startIndex: number;
  } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const mentionOptions = isDefined(mentionQuery)
    ? workspaceMembers
        .filter((workspaceMember) =>
          normalize(getPrecaturChatMemberName(workspaceMember)).includes(
            normalize(mentionQuery.query),
          ),
        )
        .slice(0, MAX_MENTION_OPTIONS)
    : [];

  const isMentionMenuOpen = mentionOptions.length > 0;

  const updateMentionQuery = (text: string, caretPosition: number) => {
    setMentionQuery(getPrecaturChatMentionQuery(text.slice(0, caretPosition)));
    setHighlightedIndex(0);
  };

  const closeMentionMenu = () => setMentionQuery(null);

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((previousIndex) => {
      const optionCount = mentionOptions.length;

      return (previousIndex + direction + optionCount) % optionCount;
    });
  };

  // Troca "@que" por "@Nome Sobrenome " e devolve o novo texto + cursor
  const applyMention = (
    text: string,
    caretPosition: number,
    workspaceMember: PartialWorkspaceMember,
  ) => {
    if (!isDefined(mentionQuery)) {
      return { text, caretPosition };
    }

    const insertion = `@${getPrecaturChatMemberName(workspaceMember)} `;
    const nextText =
      text.slice(0, mentionQuery.startIndex) +
      insertion +
      text.slice(caretPosition);

    setMentionQuery(null);

    return {
      text: nextText,
      caretPosition: mentionQuery.startIndex + insertion.length,
    };
  };

  return {
    mentionOptions,
    highlightedMention: mentionOptions[highlightedIndex],
    highlightedIndex,
    isMentionMenuOpen,
    updateMentionQuery,
    closeMentionMenu,
    moveHighlight,
    applyMention,
  };
};

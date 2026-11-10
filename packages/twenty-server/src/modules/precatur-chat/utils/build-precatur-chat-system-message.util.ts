import { isNonEmptyString } from '@sniptt/guards';

export type PrecaturChatMentionedMember = {
  id: string;
  name?: { firstName?: string | null; lastName?: string | null } | null;
};

// Mesmo formato do front: "@Nome Sobrenome" no texto + id em
// mentionedWorkspaceMemberIds (o front só destaca nomes que estão na lista)
export const getPrecaturChatMemberDisplayName = (
  member: PrecaturChatMentionedMember,
) => `${member.name?.firstName ?? ''} ${member.name?.lastName ?? ''}`.trim();

export const buildPrecaturChatSystemMessage = ({
  text,
  mentionedMembers,
}: {
  text: string;
  mentionedMembers: PrecaturChatMentionedMember[];
}) => {
  const mentions = mentionedMembers
    .map((member) => ({
      id: member.id,
      displayName: getPrecaturChatMemberDisplayName(member),
    }))
    .filter((member) => isNonEmptyString(member.displayName));

  const body = [
    ...mentions.map((member) => `@${member.displayName}`),
    text,
  ].join(' ');

  return {
    name: body.slice(0, 80),
    body,
    mentionedWorkspaceMemberIds: mentions.map((member) => member.id),
  };
};

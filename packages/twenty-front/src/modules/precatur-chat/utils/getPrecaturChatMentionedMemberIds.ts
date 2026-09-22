import { getPrecaturChatMemberName } from '@/precatur-chat/utils/getPrecaturChatMemberName';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

// Menção vale se o "@Nome Sobrenome" continua no texto na hora de enviar
// (a pessoa pode ter apagado depois de escolher na lista)
export const getPrecaturChatMentionedMemberIds = (
  body: string,
  workspaceMembers: PartialWorkspaceMember[],
) =>
  workspaceMembers
    .filter((workspaceMember) => {
      const name = getPrecaturChatMemberName(workspaceMember);

      return name.length > 0 && body.includes(`@${name}`);
    })
    .map((workspaceMember) => workspaceMember.id);

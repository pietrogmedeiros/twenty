import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

export const getPrecaturChatMemberName = (
  workspaceMember: Pick<PartialWorkspaceMember, 'name'>,
) =>
  `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`.trim();

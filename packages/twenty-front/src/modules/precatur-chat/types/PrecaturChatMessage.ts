import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type PrecaturChatMessage = ObjectRecord & {
  body: string | null;
  targetObjectNameSingular: string | null;
  targetRecordId: string | null;
  targetRecordLabel: string | null;
  mentionedWorkspaceMemberIds: string[] | null;
  attachmentIds: string[] | null;
  createdAt: string;
  createdBy: {
    source: string;
    workspaceMemberId: string | null;
    name: string;
  } | null;
};

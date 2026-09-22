import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type PrecaturChatReadState = ObjectRecord & {
  workspaceMemberId: string | null;
  targetObjectNameSingular: string | null;
  targetRecordId: string | null;
  lastReadAt: string | null;
};

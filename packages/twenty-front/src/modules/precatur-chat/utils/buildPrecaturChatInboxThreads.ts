import { type PrecaturChatInboxThread } from '@/precatur-chat/types/PrecaturChatInboxThread';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatReadState } from '@/precatur-chat/types/PrecaturChatReadState';
import { getPrecaturChatThreadKey } from '@/precatur-chat/utils/getPrecaturChatThreadKey';
import { isDefined } from 'twenty-shared/utils';

// `messages` chega da mais nova para a mais antiga
export const buildPrecaturChatInboxThreads = ({
  messages,
  myReadStates,
  currentWorkspaceMemberId,
}: {
  messages: PrecaturChatMessage[];
  myReadStates: PrecaturChatReadState[];
  currentWorkspaceMemberId: string | undefined;
}): PrecaturChatInboxThread[] => {
  const lastReadAtByKey = new Map<string, number>();

  for (const readState of myReadStates) {
    if (
      !isDefined(readState.targetObjectNameSingular) ||
      !isDefined(readState.targetRecordId) ||
      !isDefined(readState.lastReadAt)
    ) {
      continue;
    }

    const key = getPrecaturChatThreadKey({
      targetObjectNameSingular: readState.targetObjectNameSingular,
      targetRecordId: readState.targetRecordId,
    });
    const lastReadAt = new Date(readState.lastReadAt).getTime();

    lastReadAtByKey.set(
      key,
      Math.max(lastReadAt, lastReadAtByKey.get(key) ?? 0),
    );
  }

  const threadsByKey = new Map<string, PrecaturChatInboxThread>();

  for (const message of messages) {
    if (
      !isDefined(message.targetObjectNameSingular) ||
      !isDefined(message.targetRecordId)
    ) {
      continue;
    }

    const target = {
      targetObjectNameSingular: message.targetObjectNameSingular,
      targetRecordId: message.targetRecordId,
    };
    const key = getPrecaturChatThreadKey(target);
    const isOwnMessage =
      message.createdBy?.workspaceMemberId === currentWorkspaceMemberId;
    const isMentioned =
      isDefined(currentWorkspaceMemberId) &&
      (message.mentionedWorkspaceMemberIds ?? []).includes(
        currentWorkspaceMemberId,
      );
    const isUnread =
      !isOwnMessage &&
      new Date(message.createdAt).getTime() > (lastReadAtByKey.get(key) ?? 0);

    const existingThread = threadsByKey.get(key);

    if (!isDefined(existingThread)) {
      threadsByKey.set(key, {
        ...target,
        key,
        targetRecordLabel: message.targetRecordLabel ?? 'Registro',
        lastMessage: message,
        unreadCount: isUnread ? 1 : 0,
        isParticipant: lastReadAtByKey.has(key) || isOwnMessage || isMentioned,
      });
      continue;
    }

    existingThread.unreadCount += isUnread ? 1 : 0;
    existingThread.isParticipant ||= isOwnMessage || isMentioned;
  }

  // Não lida só conta em conversa da qual a pessoa participa
  return [...threadsByKey.values()].map((thread) =>
    thread.isParticipant ? thread : { ...thread, unreadCount: 0 },
  );
};

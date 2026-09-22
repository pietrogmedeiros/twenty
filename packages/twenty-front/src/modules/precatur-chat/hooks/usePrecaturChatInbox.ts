import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { PRECATUR_CHAT_INBOX_MESSAGE_LIMIT } from '@/precatur-chat/constants/PrecaturChatInboxMessageLimit';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatMessageObjectName';
import { PRECATUR_CHAT_READ_STATE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatReadStateObjectName';
import { PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS } from '@/precatur-chat/constants/PrecaturChatMessageRecordGqlFields';
import { PRECATUR_CHAT_READ_STATE_RECORD_GQL_FIELDS } from '@/precatur-chat/constants/PrecaturChatReadStateRecordGqlFields';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatReadState } from '@/precatur-chat/types/PrecaturChatReadState';
import { buildPrecaturChatInboxThreads } from '@/precatur-chat/utils/buildPrecaturChatInboxThreads';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

const INBOX_MESSAGES_OPERATION_SIGNATURE = {
  objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
  variables: {},
};

export const usePrecaturChatInbox = ({ queryId }: { queryId: string }) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMemberId = currentWorkspaceMember?.id;

  const { objectMetadataItem: messageMetadata } = useObjectMetadataItem({
    objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
  });
  const { objectMetadataItem: readStateMetadata } = useObjectMetadataItem({
    objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
  });

  const { records: messages, refetch: refetchMessages } =
    useFindManyRecords<PrecaturChatMessage>({
      objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
      orderBy: [{ createdAt: 'DescNullsLast' }],
      limit: PRECATUR_CHAT_INBOX_MESSAGE_LIMIT,
      recordGqlFields: PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS,
      fetchPolicy: 'cache-and-network',
    });

  const readStatesFilter = useMemo(
    () => ({ workspaceMemberId: { eq: currentWorkspaceMemberId } }),
    [currentWorkspaceMemberId],
  );

  const { records: myReadStates, refetch: refetchReadStates } =
    useFindManyRecords<PrecaturChatReadState>({
      objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
      filter: readStatesFilter,
      limit: PRECATUR_CHAT_INBOX_MESSAGE_LIMIT,
      recordGqlFields: PRECATUR_CHAT_READ_STATE_RECORD_GQL_FIELDS,
      skip: !isDefined(currentWorkspaceMemberId),
      fetchPolicy: 'cache-and-network',
    });

  useListenToEventsForQuery({
    queryId,
    operationSignature: INBOX_MESSAGES_OPERATION_SIGNATURE,
  });

  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: messageMetadata.id,
    onObjectRecordOperationBrowserEvent: () => {
      void refetchMessages();
    },
  });

  // Marcar como lido acontece na conversa aberta; o contador acompanha
  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: readStateMetadata.id,
    onObjectRecordOperationBrowserEvent: () => {
      void refetchReadStates();
    },
  });

  const threads = useMemo(
    () =>
      buildPrecaturChatInboxThreads({
        messages,
        myReadStates,
        currentWorkspaceMemberId,
      }),
    [currentWorkspaceMemberId, messages, myReadStates],
  );

  const totalUnreadCount = threads.reduce(
    (total, thread) => total + thread.unreadCount,
    0,
  );

  return { threads, totalUnreadCount };
};

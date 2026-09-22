import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { PRECATUR_CHAT_READ_STATE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatReadStateObjectName';
import { PRECATUR_CHAT_READ_STATE_RECORD_GQL_FIELDS } from '@/precatur-chat/constants/PrecaturChatReadStateRecordGqlFields';
import { type PrecaturChatReadState } from '@/precatur-chat/types/PrecaturChatReadState';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useCallback, useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

// Registro de leitura criado nesta sessão, por membro+conversa. A lista vinda
// do servidor demora um refetch para enxergar o registro novo; sem isso uma
// segunda mensagem nesse intervalo criaria um registro duplicado.
const createdReadStateIdByKey = new Map<string, Promise<string>>();

export const usePrecaturChatReadStates = ({
  targetObjectNameSingular,
  targetRecordId,
}: PrecaturChatTarget) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
  });

  const filter = useMemo(
    () => ({
      targetObjectNameSingular: { eq: targetObjectNameSingular },
      targetRecordId: { eq: targetRecordId },
    }),
    [targetObjectNameSingular, targetRecordId],
  );

  const {
    records: readStates,
    loading: isLoadingReadStates,
    refetch,
  } = useFindManyRecords<PrecaturChatReadState>({
    objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
    filter,
    recordGqlFields: PRECATUR_CHAT_READ_STATE_RECORD_GQL_FIELDS,
    fetchPolicy: 'cache-and-network',
  });

  const operationSignature = useMemo(
    () => ({
      objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
      variables: { filter },
    }),
    [filter],
  );

  useListenToEventsForQuery({
    queryId: `precatur-chat-read-${targetObjectNameSingular}-${targetRecordId}`,
    operationSignature,
  });

  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: objectMetadataItem.id,
    onObjectRecordOperationBrowserEvent: () => {
      void refetch();
    },
  });

  const { createOneRecord } = useCreateOneRecord<PrecaturChatReadState>({
    objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
    recordGqlFields: PRECATUR_CHAT_READ_STATE_RECORD_GQL_FIELDS,
  });

  const { updateOneRecord } = useUpdateOneRecord();

  // Se houver mais de um (dados antigos), vale a leitura mais recente
  const myReadState = readStates
    .filter(
      (readState) => readState.workspaceMemberId === currentWorkspaceMember?.id,
    )
    .sort(
      (readStateA, readStateB) =>
        new Date(readStateB.lastReadAt ?? 0).getTime() -
        new Date(readStateA.lastReadAt ?? 0).getTime(),
    )[0];

  const markAsRead = useCallback(
    async (lastMessageCreatedAt: string) => {
      // Sem a lista carregada não dá para saber se o registro já existe
      if (!isDefined(currentWorkspaceMember) || isLoadingReadStates) {
        return;
      }

      const alreadyRead =
        isDefined(myReadState?.lastReadAt) &&
        new Date(myReadState.lastReadAt).getTime() >=
          new Date(lastMessageCreatedAt).getTime();

      if (alreadyRead) {
        return;
      }

      const lastReadAt = new Date().toISOString();
      const readStateKey = `${currentWorkspaceMember.id}:${targetObjectNameSingular}:${targetRecordId}`;
      const pendingReadStateId = createdReadStateIdByKey.get(readStateKey);

      const existingReadStateId = isDefined(myReadState)
        ? myReadState.id
        : isDefined(pendingReadStateId)
          ? await pendingReadStateId
          : undefined;

      if (isDefined(existingReadStateId)) {
        await updateOneRecord({
          objectNameSingular: PRECATUR_CHAT_READ_STATE_OBJECT_NAME,
          idToUpdate: existingReadStateId,
          updateOneRecordInput: { lastReadAt },
        });
        return;
      }

      const creation = createOneRecord({
        name: `${currentWorkspaceMember.name.firstName} ${currentWorkspaceMember.name.lastName}`.trim(),
        workspaceMemberId: currentWorkspaceMember.id,
        targetObjectNameSingular,
        targetRecordId,
        lastReadAt,
      }).then((readState) => readState.id);

      createdReadStateIdByKey.set(readStateKey, creation);

      try {
        await creation;
      } catch (error) {
        createdReadStateIdByKey.delete(readStateKey);
        throw error;
      }
    },
    [
      createOneRecord,
      currentWorkspaceMember,
      isLoadingReadStates,
      myReadState,
      targetObjectNameSingular,
      targetRecordId,
      updateOneRecord,
    ],
  );

  return { readStates, markAsRead };
};

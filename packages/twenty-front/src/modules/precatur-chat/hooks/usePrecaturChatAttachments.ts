import { type Attachment } from '@/activities/files/types/Attachment';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

// Um único fetch por conversa com todos os anexos citados nas mensagens.
// A URL do arquivo vem assinada pelo servidor a cada busca.
export const usePrecaturChatAttachments = (attachmentIds: string[]) => {
  const { records } = useFindManyRecords<Attachment>({
    objectNameSingular: CoreObjectNameSingular.Attachment,
    filter: { id: { in: attachmentIds } },
    recordGqlFields: { id: true, name: true, file: true },
    skip: attachmentIds.length === 0,
  });

  return useMemo(
    () => new Map(records.map((attachment) => [attachment.id, attachment])),
    [records],
  );
};

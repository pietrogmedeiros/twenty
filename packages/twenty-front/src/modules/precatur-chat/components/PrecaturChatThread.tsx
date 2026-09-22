import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { PrecaturChatComposer } from '@/precatur-chat/components/PrecaturChatComposer';
import { PrecaturChatMessageList } from '@/precatur-chat/components/PrecaturChatMessageList';
import { usePrecaturChatAttachments } from '@/precatur-chat/hooks/usePrecaturChatAttachments';
import { usePrecaturChatMessages } from '@/precatur-chat/hooks/usePrecaturChatMessages';
import { usePrecaturChatReadStates } from '@/precatur-chat/hooks/usePrecaturChatReadStates';
import { useSendPrecaturChatMessage } from '@/precatur-chat/hooks/useSendPrecaturChatMessage';
import { useUploadPrecaturChatAttachment } from '@/precatur-chat/hooks/useUploadPrecaturChatAttachment';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledThread = styled.div`
  background: ${themeCssVariables.background.secondary};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

type PrecaturChatThreadProps = PrecaturChatTarget & {
  targetRecordLabel: string;
};

export const PrecaturChatThread = ({
  targetObjectNameSingular,
  targetRecordId,
  targetRecordLabel,
}: PrecaturChatThreadProps) => {
  const target = { targetObjectNameSingular, targetRecordId };

  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );

  const workspaceMembersById = useMemo(
    () =>
      new Map(
        currentWorkspaceMembers.map((workspaceMember) => [
          workspaceMember.id,
          workspaceMember,
        ]),
      ),
    [currentWorkspaceMembers],
  );

  // Não sugere a própria pessoa na lista de menções
  const mentionableMembers = useMemo(
    () =>
      currentWorkspaceMembers.filter(
        (workspaceMember) => workspaceMember.id !== currentWorkspaceMember?.id,
      ),
    [currentWorkspaceMember?.id, currentWorkspaceMembers],
  );

  const { messages } = usePrecaturChatMessages(target);
  const { readStates, markAsRead } = usePrecaturChatReadStates(target);

  const attachmentIds = useMemo(
    () => messages.flatMap((message) => message.attachmentIds ?? []),
    [messages],
  );
  const attachmentsById = usePrecaturChatAttachments(attachmentIds);

  const lastMessageCreatedAt = messages.at(-1)?.createdAt;

  // Abrir a conversa (ou receber mensagem com ela aberta) conta como lido
  useEffect(() => {
    if (isDefined(lastMessageCreatedAt)) {
      // Falha ao registrar leitura só afeta o "visualizado"; não interrompe o chat
      markAsRead(lastMessageCreatedAt).catch(() => undefined);
    }
  }, [lastMessageCreatedAt, markAsRead]);

  const { sendPrecaturChatMessage } = useSendPrecaturChatMessage({
    ...target,
    targetRecordLabel,
  });
  const { uploadPrecaturChatAttachment } = useUploadPrecaturChatAttachment();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async ({
    body,
    mentionedWorkspaceMemberIds,
    files,
  }: {
    body: string;
    mentionedWorkspaceMemberIds: string[];
    files: File[];
  }) => {
    setIsSending(true);

    try {
      const uploadedAttachmentIds: string[] = [];

      for (const file of files) {
        uploadedAttachmentIds.push(
          await uploadPrecaturChatAttachment(file, target),
        );
      }

      await sendPrecaturChatMessage({
        body,
        mentionedWorkspaceMemberIds,
        attachmentIds: uploadedAttachmentIds,
      });

      return true;
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? `Não foi possível enviar: ${error.message}`
            : 'Não foi possível enviar a mensagem',
      });

      return false;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <StyledThread>
      <PrecaturChatMessageList
        messages={messages}
        readStates={readStates}
        attachmentsById={attachmentsById}
        workspaceMembersById={workspaceMembersById}
        currentWorkspaceMemberId={currentWorkspaceMember?.id}
        targetRecordLabel={targetRecordLabel}
      />
      <PrecaturChatComposer
        workspaceMembers={mentionableMembers}
        isSending={isSending}
        onSend={handleSend}
      />
    </StyledThread>
  );
};

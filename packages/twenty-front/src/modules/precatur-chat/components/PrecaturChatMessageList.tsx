import { type Attachment } from '@/activities/files/types/Attachment';
import { PrecaturChatMessageItem } from '@/precatur-chat/components/PrecaturChatMessageItem';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatReadState } from '@/precatur-chat/types/PrecaturChatReadState';
import {
  formatPrecaturChatDay,
  getPrecaturChatDayKey,
} from '@/precatur-chat/utils/formatPrecaturChatDay';
import { getPrecaturChatMemberName } from '@/precatur-chat/utils/getPrecaturChatMemberName';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { styled } from '@linaria/react';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Agrupa mensagens seguidas do mesmo autor (só a primeira mostra nome/avatar)
const AUTHOR_GROUP_WINDOW_IN_MS = 5 * 60 * 1000;

const StyledScroll = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledDaySeparator = styled.div`
  align-self: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[3]} 0;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
`;

const StyledSeenBy = styled.div`
  align-items: center;
  align-self: flex-end;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const StyledEmpty = styled.div`
  align-self: center;
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  margin: auto;
  text-align: center;
`;

type PrecaturChatMessageListProps = {
  messages: PrecaturChatMessage[];
  readStates: PrecaturChatReadState[];
  attachmentsById: Map<string, Attachment>;
  workspaceMembersById: Map<string, PartialWorkspaceMember>;
  currentWorkspaceMemberId: string | undefined;
  targetRecordLabel: string;
};

export const PrecaturChatMessageList = ({
  messages,
  readStates,
  attachmentsById,
  workspaceMembersById,
  currentWorkspaceMemberId,
  targetRecordLabel,
}: PrecaturChatMessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;

  // Sempre abre/rola para a mensagem mais nova, como em qualquer chat. Anexos
  // e "visualizado por" chegam depois e aumentam a altura: rola de novo.
  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;

    if (isDefined(scrollElement)) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [lastMessageId, attachmentsById, readStates]);

  if (messages.length === 0) {
    return (
      <StyledScroll ref={scrollRef}>
        <StyledEmpty>
          Este bate-papo foi criado para discutir {targetRecordLabel}.
          <br />
          Digite @ para mencionar alguém.
        </StyledEmpty>
      </StyledScroll>
    );
  }

  const lastOwnMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.createdBy?.workspaceMemberId === currentWorkspaceMemberId,
    );

  // Nomes únicos: registros de leitura duplicados não podem repetir a pessoa
  const seenByNames = isDefined(lastOwnMessage)
    ? [
        ...new Set(
          readStates
            .filter(
              (readState) =>
                readState.workspaceMemberId !== currentWorkspaceMemberId &&
                isDefined(readState.lastReadAt) &&
                new Date(readState.lastReadAt).getTime() >=
                  new Date(lastOwnMessage.createdAt).getTime(),
            )
            .map((readState) => {
              const workspaceMember = workspaceMembersById.get(
                readState.workspaceMemberId ?? '',
              );

              return isDefined(workspaceMember)
                ? getPrecaturChatMemberName(workspaceMember)
                : readState.name;
            }),
        ),
      ]
    : [];

  return (
    <StyledScroll ref={scrollRef}>
      {messages.map((message, index) => {
        const previousMessage = messages[index - 1];
        const createdAt = new Date(message.createdAt);
        const isNewDay =
          !isDefined(previousMessage) ||
          getPrecaturChatDayKey(new Date(previousMessage.createdAt)) !==
            getPrecaturChatDayKey(createdAt);

        const authorId = message.createdBy?.workspaceMemberId ?? null;
        const isSameAuthorGroup =
          !isNewDay &&
          isDefined(previousMessage) &&
          previousMessage.createdBy?.workspaceMemberId === authorId &&
          createdAt.getTime() - new Date(previousMessage.createdAt).getTime() <
            AUTHOR_GROUP_WINDOW_IN_MS;

        const mentionedNames = (message.mentionedWorkspaceMemberIds ?? [])
          .map((memberId) => workspaceMembersById.get(memberId))
          .filter(isDefined)
          .map(getPrecaturChatMemberName);

        return (
          <Fragment key={message.id}>
            {isNewDay && (
              <StyledDaySeparator>
                {formatPrecaturChatDay(createdAt)}
              </StyledDaySeparator>
            )}
            <PrecaturChatMessageItem
              message={message}
              isOwn={authorId === currentWorkspaceMemberId}
              showAuthor={!isSameAuthorGroup}
              authorAvatarUrl={
                workspaceMembersById.get(authorId ?? '')?.avatarUrl ?? null
              }
              mentionedNames={mentionedNames}
              attachmentsById={attachmentsById}
            />
            {message.id === lastOwnMessage?.id && seenByNames.length > 0 && (
              <StyledSeenBy>
                <IconCheck size={14} />
                Visualizado por {seenByNames.join(', ')}
              </StyledSeenBy>
            )}
          </Fragment>
        );
      })}
    </StyledScroll>
  );
};

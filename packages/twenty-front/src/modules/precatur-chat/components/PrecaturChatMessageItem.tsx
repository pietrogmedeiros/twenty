import { type Attachment } from '@/activities/files/types/Attachment';
import { PrecaturChatMessageBody } from '@/precatur-chat/components/PrecaturChatMessageBody';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { formatPrecaturChatTime } from '@/precatur-chat/utils/formatPrecaturChatDay';
import { styled } from '@linaria/react';
import { isDefined, getSafeUrl } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/data-display';
import { IconPaperclip } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRow = styled.div<{ isOwn: boolean }>`
  align-items: flex-end;
  display: flex;
  flex-direction: ${({ isOwn }) => (isOwn ? 'row-reverse' : 'row')};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledAvatarSlot = styled.div`
  flex-shrink: 0;
  width: 24px;
`;

const StyledBubble = styled.div<{ isOwn: boolean }>`
  background: ${({ isOwn }) =>
    isOwn
      ? themeCssVariables.accent.quaternary
      : themeCssVariables.background.primary};
  border: 1px solid
    ${({ isOwn }) =>
      isOwn
        ? themeCssVariables.accent.tertiary
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  max-width: min(560px, 80%);
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledAuthor = styled.div`
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledFooter = styled.div`
  align-self: flex-end;
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledAttachmentLink = styled.a`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  overflow: hidden;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledPendingAttachment = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

type PrecaturChatMessageItemProps = {
  message: PrecaturChatMessage;
  isOwn: boolean;
  showAuthor: boolean;
  authorAvatarUrl: string | null;
  mentionedNames: string[];
  attachmentsById: Map<string, Attachment>;
};

export const PrecaturChatMessageItem = ({
  message,
  isOwn,
  showAuthor,
  authorAvatarUrl,
  mentionedNames,
  attachmentsById,
}: PrecaturChatMessageItemProps) => {
  const authorName = message.createdBy?.name ?? '';
  const attachmentIds = message.attachmentIds ?? [];

  return (
    <StyledRow isOwn={isOwn}>
      <StyledAvatarSlot>
        {!isOwn && showAuthor && (
          <Avatar
            avatarUrl={authorAvatarUrl}
            placeholder={authorName}
            placeholderColorSeed={message.createdBy?.workspaceMemberId ?? ''}
            type="rounded"
            size="md"
          />
        )}
      </StyledAvatarSlot>
      <StyledBubble isOwn={isOwn}>
        {!isOwn && showAuthor && <StyledAuthor>{authorName}</StyledAuthor>}
        {isDefined(message.body) && message.body.length > 0 && (
          <PrecaturChatMessageBody
            body={message.body}
            mentionedNames={mentionedNames}
          />
        )}
        {attachmentIds.map((attachmentId) => {
          const attachment = attachmentsById.get(attachmentId);
          const file = attachment?.file?.[0];

          if (!isDefined(attachment) || !isDefined(file?.url)) {
            return (
              <StyledPendingAttachment key={attachmentId}>
                Anexo indisponível
              </StyledPendingAttachment>
            );
          }

          return (
            <StyledAttachmentLink
              key={attachmentId}
              href={getSafeUrl(file.url)}
              target="_blank"
              rel="noopener noreferrer"
              title={attachment.name}
            >
              <IconPaperclip size={14} />
              {attachment.name}
            </StyledAttachmentLink>
          );
        })}
        <StyledFooter>
          {formatPrecaturChatTime(new Date(message.createdAt))}
        </StyledFooter>
      </StyledBubble>
    </StyledRow>
  );
};

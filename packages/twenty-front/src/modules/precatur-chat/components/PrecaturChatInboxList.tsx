import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type PrecaturChatInboxThread } from '@/precatur-chat/types/PrecaturChatInboxThread';
import { formatPrecaturChatListDate } from '@/precatur-chat/utils/formatPrecaturChatDay';
import { styled } from '@linaria/react';
import { useIcons } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledItem = styled.button<{ isSelected: boolean }>`
  align-items: flex-start;
  background: ${({ isSelected }) =>
    isSelected ? themeCssVariables.accent.quaternary : 'none'};
  border: none;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${({ isSelected }) =>
      isSelected
        ? themeCssVariables.accent.quaternary
        : themeCssVariables.background.transparent.lighter};
  }
`;

const StyledIcon = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-shrink: 0;
  height: 36px;
  justify-content: center;
  width: 36px;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledTopLine = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTitle = styled.span<{ isUnread: boolean }>`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${({ isUnread }) =>
    isUnread
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDate = styled.span`
  color: ${themeCssVariables.font.color.light};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledBottomLine = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledPreview = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledUnread = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.inverted};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 18px;
  min-width: 18px;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

type PrecaturChatInboxListProps = {
  threads: PrecaturChatInboxThread[];
  selectedThreadKey: string | null;
  onSelect: (thread: PrecaturChatInboxThread) => void;
};

export const PrecaturChatInboxList = ({
  threads,
  selectedThreadKey,
  onSelect,
}: PrecaturChatInboxListProps) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { getIcon } = useIcons();

  if (threads.length === 0) {
    return <StyledEmpty>Nenhuma conversa por aqui.</StyledEmpty>;
  }

  return (
    <>
      {threads.map((thread) => {
        const objectMetadataItem = objectMetadataItems.find(
          (item) => item.nameSingular === thread.targetObjectNameSingular,
        );
        const ObjectIcon = getIcon(objectMetadataItem?.icon);
        const authorName = thread.lastMessage.createdBy?.name ?? '';
        const body =
          thread.lastMessage.body?.trim() ||
          ((thread.lastMessage.attachmentIds ?? []).length > 0
            ? '[Anexo]'
            : '');

        return (
          <StyledItem
            key={thread.key}
            type="button"
            isSelected={thread.key === selectedThreadKey}
            onClick={() => onSelect(thread)}
          >
            <StyledIcon>
              <ObjectIcon size={18} />
            </StyledIcon>
            <StyledContent>
              <StyledTopLine>
                <StyledTitle isUnread={thread.unreadCount > 0}>
                  {objectMetadataItem?.labelSingular ?? 'Registro'}:{' '}
                  {thread.targetRecordLabel}
                </StyledTitle>
                <StyledDate>
                  {formatPrecaturChatListDate(
                    new Date(thread.lastMessage.createdAt),
                  )}
                </StyledDate>
              </StyledTopLine>
              <StyledBottomLine>
                <StyledPreview>
                  {authorName.length > 0 ? `${authorName}: ` : ''}
                  {body}
                </StyledPreview>
                {thread.unreadCount > 0 && (
                  <StyledUnread>{thread.unreadCount}</StyledUnread>
                )}
              </StyledBottomLine>
            </StyledContent>
          </StyledItem>
        );
      })}
    </>
  );
};

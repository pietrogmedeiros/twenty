import { PrecaturChatMentionMenu } from '@/precatur-chat/components/PrecaturChatMentionMenu';
import { usePrecaturChatMentions } from '@/precatur-chat/hooks/usePrecaturChatMentions';
import { type SendPrecaturChatMessageInput } from '@/precatur-chat/hooks/useSendPrecaturChatMessage';
import { getPrecaturChatMentionedMemberIds } from '@/precatur-chat/utils/getPrecaturChatMentionedMemberIds';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { styled } from '@linaria/react';
import { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconPaperclip, IconSend, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledBox = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  position: relative;

  &:focus-within {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledTextArea = styled.textarea`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  line-height: ${themeCssVariables.text.lineHeight.lg};
  max-height: 160px;
  outline: none;
  resize: none;

  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }
`;

const StyledToolbar = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledPendingFiles = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledPendingFile = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: 2px ${themeCssVariables.spacing[2]};
`;

const StyledIconButton = styled.button<{ isPrimary?: boolean }>`
  align-items: center;
  background: ${({ isPrimary }) =>
    isPrimary ? themeCssVariables.color.blue : 'none'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${({ isPrimary }) =>
    isPrimary
      ? themeCssVariables.font.color.inverted
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  height: 32px;
  justify-content: center;
  padding: 0;
  width: 32px;

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

type PrecaturChatComposerProps = {
  workspaceMembers: PartialWorkspaceMember[];
  isSending: boolean;
  onSend: (
    input: Omit<SendPrecaturChatMessageInput, 'attachmentIds'> & {
      files: File[];
    },
  ) => Promise<boolean>;
};

export const PrecaturChatComposer = ({
  workspaceMembers,
  isSending,
  onSend,
}: PrecaturChatComposerProps) => {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    mentionOptions,
    highlightedMention,
    highlightedIndex,
    isMentionMenuOpen,
    updateMentionQuery,
    closeMentionMenu,
    moveHighlight,
    applyMention,
  } = usePrecaturChatMentions(workspaceMembers);

  const canSend =
    !isSending && (text.trim().length > 0 || pendingFiles.length > 0);

  const resizeTextArea = () => {
    const textArea = textAreaRef.current;

    if (isDefined(textArea)) {
      textArea.style.height = 'auto';
      textArea.style.height = `${textArea.scrollHeight}px`;
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    updateMentionQuery(
      event.target.value,
      event.target.selectionStart ?? event.target.value.length,
    );
    resizeTextArea();
  };

  const handleSelectMention = (workspaceMember: PartialWorkspaceMember) => {
    const textArea = textAreaRef.current;
    const caretPosition = textArea?.selectionStart ?? text.length;
    const next = applyMention(text, caretPosition, workspaceMember);

    setText(next.text);

    requestAnimationFrame(() => {
      textArea?.focus();
      textArea?.setSelectionRange(next.caretPosition, next.caretPosition);
      resizeTextArea();
    });
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const body = text.trim();
    const wasSent = await onSend({
      body,
      mentionedWorkspaceMemberIds: getPrecaturChatMentionedMemberIds(
        body,
        workspaceMembers,
      ),
      files: pendingFiles,
    });

    if (wasSent) {
      setText('');
      setPendingFiles([]);
      closeMentionMenu();
      requestAnimationFrame(resizeTextArea);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionMenuOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (
        (event.key === 'Enter' || event.key === 'Tab') &&
        isDefined(highlightedMention)
      ) {
        event.preventDefault();
        handleSelectMention(highlightedMention);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMentionMenu();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    setPendingFiles((previousFiles) => [...previousFiles, ...files]);
    event.target.value = '';
  };

  return (
    <StyledContainer>
      <StyledBox>
        {isMentionMenuOpen && (
          <PrecaturChatMentionMenu
            options={mentionOptions}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelectMention}
          />
        )}
        {pendingFiles.length > 0 && (
          <StyledPendingFiles>
            {pendingFiles.map((file, index) => (
              <StyledPendingFile key={`${file.name}-${index}`}>
                {file.name}
                <IconX
                  size={12}
                  cursor="pointer"
                  onClick={() =>
                    setPendingFiles((previousFiles) =>
                      previousFiles.filter(
                        (_, fileIndex) => fileIndex !== index,
                      ),
                    )
                  }
                />
              </StyledPendingFile>
            ))}
          </StyledPendingFiles>
        )}
        <StyledTextArea
          ref={textAreaRef}
          rows={1}
          value={text}
          placeholder="Digite @ para mencionar uma pessoa"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={closeMentionMenu}
          disabled={isSending}
        />
        <StyledToolbar>
          <StyledIconButton
            type="button"
            title="Anexar arquivo"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <IconPaperclip size={18} />
          </StyledIconButton>
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Anexar arquivo ao chat"
            multiple
            hidden
            onChange={handleFilesSelected}
          />
          <StyledHint>Enter envia · Shift+Enter quebra linha</StyledHint>
          <StyledIconButton
            type="button"
            title="Enviar"
            isPrimary
            onClick={() => void handleSend()}
            disabled={!canSend}
          >
            <IconSend size={16} />
          </StyledIconButton>
        </StyledToolbar>
      </StyledBox>
    </StyledContainer>
  );
};

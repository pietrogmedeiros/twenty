import { getPrecaturChatMemberName } from '@/precatur-chat/utils/getPrecaturChatMemberName';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { styled } from '@linaria/react';
import { Avatar } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledMenu = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  bottom: calc(100% + ${themeCssVariables.spacing[1]});
  box-shadow: ${themeCssVariables.boxShadow.strong};
  left: 0;
  max-height: 240px;
  min-width: 240px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[1]};
  position: absolute;
  z-index: 10;
`;

const StyledOption = styled.button<{ isHighlighted: boolean }>`
  align-items: center;
  background: ${({ isHighlighted }) =>
    isHighlighted ? themeCssVariables.background.transparent.light : 'none'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;
`;

type PrecaturChatMentionMenuProps = {
  options: PartialWorkspaceMember[];
  highlightedIndex: number;
  onSelect: (workspaceMember: PartialWorkspaceMember) => void;
};

export const PrecaturChatMentionMenu = ({
  options,
  highlightedIndex,
  onSelect,
}: PrecaturChatMentionMenuProps) => (
  <StyledMenu>
    {options.map((workspaceMember, index) => (
      <StyledOption
        key={workspaceMember.id}
        type="button"
        isHighlighted={index === highlightedIndex}
        // mousedown para não tirar o foco do campo antes de inserir o nome
        onMouseDown={(event) => {
          event.preventDefault();
          onSelect(workspaceMember);
        }}
      >
        <Avatar
          avatarUrl={workspaceMember.avatarUrl}
          placeholder={getPrecaturChatMemberName(workspaceMember)}
          placeholderColorSeed={workspaceMember.id}
          type="rounded"
          size="sm"
        />
        {getPrecaturChatMemberName(workspaceMember)}
      </StyledOption>
    ))}
  </StyledMenu>
);

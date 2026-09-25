import { styled } from '@linaria/react';
import { type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledButton = styled.button<{ isActive: boolean; isDanger: boolean }>`
  align-items: center;
  background: ${({ isActive, isDanger }) =>
    isDanger
      ? themeCssVariables.color.red
      : isActive
        ? themeCssVariables.font.color.primary
        : themeCssVariables.background.transparent.light};
  border: none;
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${({ isActive, isDanger }) =>
    isDanger || isActive
      ? themeCssVariables.font.color.inverted
      : themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  height: 48px;
  justify-content: center;
  width: 48px;

  &:hover {
    opacity: 0.85;
  }
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

type PrecaturCallRoundButtonProps = {
  Icon: IconComponent;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  isDanger?: boolean;
};

export const PrecaturCallRoundButton = ({
  Icon,
  label,
  onClick,
  isActive = false,
  isDanger = false,
}: PrecaturCallRoundButtonProps) => (
  <StyledContainer>
    <StyledButton
      type="button"
      aria-label={label}
      isActive={isActive}
      isDanger={isDanger}
      onClick={onClick}
    >
      <Icon size={20} />
    </StyledButton>
    <StyledLabel>{label}</StyledLabel>
  </StyledContainer>
);

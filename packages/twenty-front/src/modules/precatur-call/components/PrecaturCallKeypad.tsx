import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const KEYPAD_DIGITS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '*',
  '0',
  '#',
];

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
`;

const StyledKey = styled.button`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.lg};
  padding: ${themeCssVariables.spacing[2]} 0;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

type PrecaturCallKeypadProps = {
  onDigit: (digit: string) => void;
};

export const PrecaturCallKeypad = ({ onDigit }: PrecaturCallKeypadProps) => (
  <StyledGrid>
    {KEYPAD_DIGITS.map((digit) => (
      <StyledKey key={digit} type="button" onClick={() => onDigit(digit)}>
        {digit}
      </StyledKey>
    ))}
  </StyledGrid>
);

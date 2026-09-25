import { PRECATUR_CALL_RESULTS } from '@/precatur-call/constants/PrecaturCallResults';
import { type PrecaturCallResult } from '@/precatur-call/types/PrecaturCallResult';
import { TextArea } from '@/ui/input/components/TextArea';
import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledResults = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(2, 1fr);
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

type PrecaturCallSummaryProps = {
  result: PrecaturCallResult;
  notes: string;
  isRegistering: boolean;
  onResultChange: (result: PrecaturCallResult) => void;
  onNotesChange: (notes: string) => void;
  onDiscard: () => void;
  onRegister: () => void;
};

export const PrecaturCallSummary = ({
  result,
  notes,
  isRegistering,
  onResultChange,
  onNotesChange,
  onDiscard,
  onRegister,
}: PrecaturCallSummaryProps) => (
  <StyledContainer>
    <StyledLabel>Resultado da ligação</StyledLabel>
    <StyledResults>
      {PRECATUR_CALL_RESULTS.map((option) => (
        <Button
          key={option.value}
          title={option.label}
          variant={option.value === result ? 'primary' : 'secondary'}
          accent={option.value === result ? 'blue' : 'default'}
          justify="center"
          fullWidth
          onClick={() => onResultChange(option.value)}
        />
      ))}
    </StyledResults>
    <TextArea
      textAreaId="precatur-call-notes"
      placeholder="Observações da ligação (opcional)"
      value={notes}
      minRows={3}
      onChange={onNotesChange}
    />
    <StyledActions>
      <Button title="Descartar" variant="secondary" onClick={onDiscard} />
      <Button
        title="Registrar ligação"
        variant="primary"
        accent="blue"
        isLoading={isRegistering}
        disabled={isRegistering}
        onClick={onRegister}
      />
    </StyledActions>
  </StyledContainer>
);

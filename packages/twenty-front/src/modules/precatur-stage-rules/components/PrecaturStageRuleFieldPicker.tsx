import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { IconSearch } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPicker = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSearch = styled.label`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledSearchInput = styled.input`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  outline: none;
`;

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  max-height: 280px;
  overflow-y: auto;
`;

const StyledOption = styled.button`
  align-items: center;
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]};
  text-align: left;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

// A linha inteira alterna; a caixa é só indicador visual
const StyledCheckboxIndicator = styled.span`
  display: flex;
  pointer-events: none;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

type PrecaturStageRuleFieldPickerProps = {
  candidateFields: FieldMetadataItem[];
  selectedFieldNames: string[];
  onToggle: (fieldName: string, isSelected: boolean) => void;
};

export const PrecaturStageRuleFieldPicker = ({
  candidateFields,
  selectedFieldNames,
  onToggle,
}: PrecaturStageRuleFieldPickerProps) => {
  const [searchText, setSearchText] = useState('');

  const visibleFields = candidateFields.filter((field) =>
    normalize(field.label).includes(normalize(searchText)),
  );

  return (
    <StyledPicker>
      <StyledSearch>
        <IconSearch size={14} />
        <StyledSearchInput
          value={searchText}
          placeholder="Buscar campo"
          onChange={(event) => setSearchText(event.target.value)}
        />
      </StyledSearch>
      {visibleFields.length === 0 ? (
        <StyledEmpty>Nenhum campo encontrado.</StyledEmpty>
      ) : (
        <StyledList>
          {visibleFields.map((field) => {
            const isSelected = selectedFieldNames.includes(field.name);

            return (
              <StyledOption
                key={field.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => onToggle(field.name, !isSelected)}
              >
                <StyledCheckboxIndicator>
                  <Checkbox checked={isSelected} />
                </StyledCheckboxIndicator>
                {field.label}
              </StyledOption>
            );
          })}
        </StyledList>
      )}
    </StyledPicker>
  );
};

import {
  type FieldMetadataItem,
  type FieldMetadataItemOption,
} from '@/object-metadata/types/FieldMetadataItem';
import { PrecaturStageRuleFieldPicker } from '@/precatur-stage-rules/components/PrecaturStageRuleFieldPicker';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/data-display';
import { IconChevronDown, IconChevronUp, IconX } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCard = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  overflow: hidden;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeaderLeft = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: nowrap;
`;

const StyledChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]};
`;

const StyledChip = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: 2px ${themeCssVariables.spacing[2]};
`;

const StyledRemoveChip = styled.button`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: 0;
`;

type PrecaturStageRuleStageCardProps = {
  stageOption: FieldMetadataItemOption;
  candidateFields: FieldMetadataItem[];
  requiredFieldNames: string[];
  onChange: (requiredFieldNames: string[]) => void;
};

export const PrecaturStageRuleStageCard = ({
  stageOption,
  candidateFields,
  requiredFieldNames,
  onChange,
}: PrecaturStageRuleStageCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const requiredFields = requiredFieldNames
    .map((fieldName) =>
      candidateFields.find((field) => field.name === fieldName),
    )
    .filter(isDefined);

  const handleToggle = (fieldName: string, isSelected: boolean) => {
    onChange(
      isSelected
        ? [...requiredFieldNames, fieldName]
        : requiredFieldNames.filter((name) => name !== fieldName),
    );
  };

  const countLabel =
    requiredFields.length === 0
      ? 'Sem campos obrigatórios'
      : requiredFields.length === 1
        ? '1 campo obrigatório'
        : `${requiredFields.length} campos obrigatórios`;

  return (
    <StyledCard>
      <StyledHeader>
        <StyledHeaderLeft>
          <Tag color={stageOption.color} text={stageOption.label} />
          <StyledCount>{countLabel}</StyledCount>
        </StyledHeaderLeft>
        <Button
          size="small"
          variant="secondary"
          title={isEditing ? 'Concluir' : 'Editar campos'}
          Icon={isEditing ? IconChevronUp : IconChevronDown}
          onClick={() => setIsEditing((previous) => !previous)}
        />
      </StyledHeader>
      {requiredFields.length > 0 && (
        <StyledChips>
          {requiredFields.map((field) => (
            <StyledChip key={field.id}>
              {field.label}
              <StyledRemoveChip
                type="button"
                title={`Remover ${field.label}`}
                onClick={() => handleToggle(field.name, false)}
              >
                <IconX size={12} />
              </StyledRemoveChip>
            </StyledChip>
          ))}
        </StyledChips>
      )}
      {isEditing && (
        <PrecaturStageRuleFieldPicker
          candidateFields={candidateFields}
          selectedFieldNames={requiredFieldNames}
          onToggle={handleToggle}
        />
      )}
    </StyledCard>
  );
};

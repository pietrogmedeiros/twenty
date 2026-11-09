import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';
import { styled } from '@linaria/react';
import { Tag } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPanel = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  margin: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]} 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledFileNames = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

type PrecaturDocumentTypePickerProps = {
  files: File[];
  documentTypeOptions: FieldMetadataItemOption[];
  onSelect: (documentType: string) => void;
  onCancel: () => void;
};

// Precatur: o tipo é escolhido antes de subir, para as regras de etapa
// saberem o que já está na pasta do processo
export const PrecaturDocumentTypePicker = ({
  files,
  documentTypeOptions,
  onSelect,
  onCancel,
}: PrecaturDocumentTypePickerProps) => (
  <StyledPanel>
    <StyledTitle>
      {files.length === 1
        ? 'Qual o tipo deste documento?'
        : `Qual o tipo destes ${files.length} documentos?`}
    </StyledTitle>
    <StyledFileNames title={files.map((file) => file.name).join(', ')}>
      {files.map((file) => file.name).join(', ')}
    </StyledFileNames>
    <StyledOptions>
      {documentTypeOptions.map((option) => (
        <Tag
          key={option.value}
          color={option.color}
          text={option.label}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </StyledOptions>
    <StyledFooter>
      <Button
        size="small"
        variant="secondary"
        title="Cancelar"
        onClick={onCancel}
      />
    </StyledFooter>
  </StyledPanel>
);

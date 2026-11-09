import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { PRECATUR_DOCUMENT_FOLDER } from '@/precatur-documents/constants/PrecaturDocumentFolder';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { Tag } from 'twenty-ui/data-display';
import { MenuItemSelectTag } from 'twenty-ui/navigation';

type PrecaturAttachmentDocumentTypeTagProps = {
  attachmentId: string;
  documentType: string | null | undefined;
  documentTypeOptions: FieldMetadataItemOption[];
};

// Precatur: tipo do documento na linha do anexo; clicar troca o tipo
export const PrecaturAttachmentDocumentTypeTag = ({
  attachmentId,
  documentType,
  documentTypeOptions,
}: PrecaturAttachmentDocumentTypeTagProps) => {
  const dropdownId = `${attachmentId}-precatur-document-type`;
  const { closeDropdown } = useCloseDropdown();
  const { updateOneRecord } = useUpdateOneRecord();

  const selectedOption = documentTypeOptions.find(
    (option) => option.value === documentType,
  );

  const handleSelect = (value: string) => {
    closeDropdown(dropdownId);
    updateOneRecord({
      objectNameSingular: CoreObjectNameSingular.Attachment,
      idToUpdate: attachmentId,
      updateOneRecordInput: {
        [PRECATUR_DOCUMENT_FOLDER.documentTypeFieldName]: value,
      },
    });
  };

  return (
    <Dropdown
      dropdownId={dropdownId}
      clickableComponent={
        <Tag
          color={selectedOption?.color ?? 'gray'}
          variant={selectedOption ? 'solid' : 'outline'}
          text={selectedOption?.label ?? 'Sem tipo'}
          preventShrink
        />
      }
      dropdownComponents={
        <DropdownContent widthInPixels={GenericDropdownContentWidth.Medium}>
          <DropdownMenuItemsContainer>
            {documentTypeOptions.map((option) => (
              <MenuItemSelectTag
                key={option.value}
                color={option.color}
                text={option.label}
                selected={option.value === documentType}
                onClick={() => handleSelect(option.value)}
              />
            ))}
          </DropdownMenuItemsContainer>
        </DropdownContent>
      }
    />
  );
};

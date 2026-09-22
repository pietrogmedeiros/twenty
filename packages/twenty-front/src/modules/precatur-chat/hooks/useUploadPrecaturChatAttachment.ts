import { type Attachment } from '@/activities/files/types/Attachment';
import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { useDirectFileUpload } from '@/file/hooks/useDirectFileUpload';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { FieldMetadataType, FileFolder } from '~/generated-metadata/graphql';

// Mesmo fluxo do upload da aba Arquivos: o arquivo fica anexado ao registro
// (centraliza os documentos do negócio) e a mensagem só guarda o id do anexo.
export const useUploadPrecaturChatAttachment = () => {
  const { uploadFile } = useDirectFileUpload();

  const { objectMetadataItem: attachmentMetadata } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Attachment,
  });

  const filesFieldMetadataId = attachmentMetadata.fields.find(
    (field) => field.type === FieldMetadataType.FILES && field.name === 'file',
  )?.id;

  const { createOneRecord } = useCreateOneRecord<Attachment>({
    objectNameSingular: CoreObjectNameSingular.Attachment,
    shouldMatchRootQueryFilter: true,
  });

  const uploadPrecaturChatAttachment = async (
    file: File,
    { targetObjectNameSingular, targetRecordId }: PrecaturChatTarget,
  ) => {
    if (!isDefined(filesFieldMetadataId)) {
      throw new Error('Campo de arquivo do anexo não encontrado');
    }

    const uploadedFile = await uploadFile(file, {
      fileFolder: FileFolder.FilesField,
      fieldMetadataId: filesFieldMetadataId,
    });

    if (!isDefined(uploadedFile)) {
      throw new Error(`Não foi possível enviar ${file.name}`);
    }

    const attachment = await createOneRecord({
      name: file.name,
      [getActivityTargetObjectFieldIdName({
        nameSingular: targetObjectNameSingular,
      })]: targetRecordId,
      file: [{ fileId: uploadedFile.id, label: file.name }],
    } as Partial<Attachment>);

    return attachment.id;
  };

  return { uploadPrecaturChatAttachment };
};

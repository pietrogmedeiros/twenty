import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { PRECATUR_SETTINGS } from '@/precatur-settings/constants/PrecaturSettings';
import { type PrecaturSetting } from '@/precatur-settings/types/PrecaturSetting';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const usePrecaturSetting = ({
  key,
  label,
}: {
  key: string;
  label: string;
}) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const isEnabled = objectMetadataItems.some(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === PRECATUR_SETTINGS.objectName &&
      objectMetadataItem.isActive,
  );

  const filter = useMemo(() => ({ chave: { eq: key } }), [key]);

  // Mais recente primeiro: o servidor lê a mesma gravação
  const { records, loading, refetch } = useFindManyRecords<PrecaturSetting>({
    objectNameSingular: PRECATUR_SETTINGS.objectName,
    filter,
    orderBy: [{ updatedAt: 'DescNullsLast' }],
    recordGqlFields: PRECATUR_SETTINGS.recordGqlFields,
    skip: !isEnabled,
  });

  const { createOneRecord } = useCreateOneRecord<PrecaturSetting>({
    objectNameSingular: PRECATUR_SETTINGS.objectName,
    recordGqlFields: PRECATUR_SETTINGS.recordGqlFields,
    shouldMatchRootQueryFilter: true,
  });
  const { updateOneRecord } = useUpdateOneRecord();

  const setting = records[0];

  const saveValue = async (valor: unknown) => {
    if (isDefined(setting)) {
      await updateOneRecord({
        objectNameSingular: PRECATUR_SETTINGS.objectName,
        idToUpdate: setting.id,
        updateOneRecordInput: { valor },
      });
      return;
    }

    await createOneRecord({ name: label, chave: key, valor });
    // Sem recarregar, a próxima troca criaria outra gravação em vez de atualizar
    await refetch();
  };

  return { isEnabled, loading, value: setting?.valor, saveValue };
};

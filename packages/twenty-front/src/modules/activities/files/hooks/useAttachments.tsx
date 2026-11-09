import { type Attachment } from '@/activities/files/types/Attachment';
import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
// Precatur: aceita vários alvos para a aba Arquivos mostrar a pasta do
// precatório junto com os anexos do próprio card
export const useAttachments = (
  targetableObjects: ActivityTargetableObject | ActivityTargetableObject[],
) => {
  const targetFilters = (
    Array.isArray(targetableObjects) ? targetableObjects : [targetableObjects]
  ).map((targetableObject) => ({
    [getActivityTargetObjectFieldIdName({
      nameSingular: targetableObject.targetObjectNameSingular,
    })]: {
      eq: targetableObject.id,
    },
  }));

  const {
    records: attachments,
    loading,
    totalCount,
  } = useFindManyRecords<Attachment>({
    objectNameSingular: CoreObjectNameSingular.Attachment,
    filter:
      targetFilters.length === 1 ? targetFilters[0] : { or: targetFilters },
    orderBy: [
      {
        createdAt: 'DescNullsFirst',
      },
    ],
  });

  return {
    attachments,
    loading,
    totalCountAttachments: totalCount,
  };
};

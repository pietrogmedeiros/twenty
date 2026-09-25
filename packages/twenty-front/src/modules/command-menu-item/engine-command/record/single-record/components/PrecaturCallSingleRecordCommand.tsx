import { isDefined } from 'twenty-shared/utils';

import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useOpenPrecaturCall } from '@/precatur-call/hooks/useOpenPrecaturCall';

// Precatur — botão fixo "Ligar" na página do registro do funil: abre o mesmo
// pop-up de ligação do botão do card no Kanban.
export const PrecaturCallSingleRecordCommand = () => {
  const { selectedRecords, objectMetadataItem } =
    useHeadlessCommandContextApi();
  const recordId = selectedRecords[0]?.id;

  if (!isDefined(recordId) || !isDefined(objectMetadataItem)) {
    throw new Error('Record is required to start a call');
  }

  const { openPrecaturCall } = useOpenPrecaturCall();

  const onExecute = () => {
    openPrecaturCall({
      recordId,
      objectNameSingular: objectMetadataItem.nameSingular,
    });
  };

  return <HeadlessEngineCommandWrapperEffect execute={onExecute} />;
};

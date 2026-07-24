import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';

// Precatur — abre o gerador de proposta pré-preenchido com a Negociação atual.
// Navega para a rota standalone /precatur/proposta?negociacaoId=<id>, que hidrata
// os dados (Precatório + Cedente) e imprime o documento via window.print().
export const GenerateProposalSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const selectedRecord = selectedRecords[0];

  const recordId = selectedRecord?.id;

  if (!isDefined(recordId)) {
    throw new Error('Record ID is required to generate a proposal');
  }

  const navigate = useNavigate();

  const onExecute = () => {
    const path = getAppPath(AppPath.PrecaturProposta, undefined, {
      negociacaoId: recordId,
    });

    // eslint-disable-next-line twenty/no-navigate-prefer-link
    navigate(path);
  };

  return <HeadlessEngineCommandWrapperEffect execute={onExecute} />;
};

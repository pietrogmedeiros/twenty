import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { PrecaturChatThread } from '@/precatur-chat/components/PrecaturChatThread';
import { useIsPrecaturChatEnabled } from '@/precatur-chat/hooks/useIsPrecaturChatEnabled';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// A aba não limita a altura dos widgets; sem altura fixa a página inteira
// rolaria em vez da lista de mensagens (barra superior + abas ≈ 112px)
const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 112px);
  min-height: 420px;
  width: 100%;
`;

const StyledNotConfigured = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[6]};
  text-align: center;
`;

type PrecaturChatWidgetProps = {
  widget: PageLayoutWidget;
};

export const PrecaturChatWidget = ({
  widget: _widget,
}: PrecaturChatWidgetProps) => {
  const isPrecaturChatEnabled = useIsPrecaturChatEnabled();

  if (!isPrecaturChatEnabled) {
    return (
      <StyledNotConfigured>
        O chat ainda não foi ativado neste workspace.
      </StyledNotConfigured>
    );
  }

  return <PrecaturChatWidgetContent />;
};

const PrecaturChatWidgetContent = () => {
  const targetRecord = useTargetRecord();

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  const recordStore = useAtomFamilyStateValue(
    recordStoreFamilyState,
    targetRecord.id,
  );

  // Nome do registro vai junto na mensagem para a caixa "Bate-papos" e o e-mail
  const targetRecordLabel = isDefined(recordStore)
    ? getObjectRecordIdentifier({
        objectMetadataItem,
        record: recordStore,
        allowRequestsToTwentyIcons: false,
      }).name
    : objectMetadataItem.labelSingular;

  return (
    <StyledContainer>
      <PrecaturChatThread
        targetObjectNameSingular={targetRecord.targetObjectNameSingular}
        targetRecordId={targetRecord.id}
        targetRecordLabel={targetRecordLabel}
      />
    </StyledContainer>
  );
};

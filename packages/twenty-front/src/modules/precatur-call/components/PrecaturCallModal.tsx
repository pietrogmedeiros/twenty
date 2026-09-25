import { PrecaturCallDialer } from '@/precatur-call/components/PrecaturCallDialer';
import { PRECATUR_CALL_MODAL_ID } from '@/precatur-call/constants/PrecaturCallModalId';
import { precaturCallTargetState } from '@/precatur-call/states/precaturCallTargetState';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { isDefined } from 'twenty-shared/utils';

// Montado uma vez no layout: o botão do card do Kanban e o botão fixo da
// página do registro só preenchem o alvo e abrem este pop-up.
export const PrecaturCallModal = () => {
  const [precaturCallTarget, setPrecaturCallTarget] = useAtomState(
    precaturCallTargetState,
  );
  const { closeModal } = useModal();

  const handleClose = () => {
    closeModal(PRECATUR_CALL_MODAL_ID);
    setPrecaturCallTarget(null);
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={PRECATUR_CALL_MODAL_ID}
      isClosable={false}
      shouldCloseModalOnClickOutsideOrEscape={false}
      padding="large"
      renderInDocumentBody
      dataGloballyPreventClickOutside
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      {isDefined(precaturCallTarget) && (
        <PrecaturCallDialer
          key={precaturCallTarget.recordId}
          target={precaturCallTarget}
          onClose={handleClose}
        />
      )}
    </ModalStatefulWrapper>
  );
};

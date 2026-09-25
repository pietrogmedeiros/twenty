import { PRECATUR_CALL_MODAL_ID } from '@/precatur-call/constants/PrecaturCallModalId';
import { precaturCallTargetState } from '@/precatur-call/states/precaturCallTargetState';
import { type PrecaturCallTarget } from '@/precatur-call/types/PrecaturCallTarget';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

export const useOpenPrecaturCall = () => {
  const setPrecaturCallTarget = useSetAtomState(precaturCallTargetState);
  const { openModal } = useModal();

  const openPrecaturCall = (target: PrecaturCallTarget) => {
    setPrecaturCallTarget(target);
    openModal(PRECATUR_CALL_MODAL_ID);
  };

  return { openPrecaturCall };
};

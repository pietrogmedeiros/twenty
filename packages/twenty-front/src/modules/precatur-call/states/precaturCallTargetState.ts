import { type PrecaturCallTarget } from '@/precatur-call/types/PrecaturCallTarget';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const precaturCallTargetState =
  createAtomState<PrecaturCallTarget | null>({
    key: 'precaturCallTargetState',
    defaultValue: null,
  });

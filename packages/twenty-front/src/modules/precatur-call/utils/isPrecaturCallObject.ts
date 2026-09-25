import { PRECATUR_CALL_OBJECT_NAMES } from '@/precatur-call/constants/PrecaturCallObjectNames';

export const isPrecaturCallObject = (objectNameSingular: string) =>
  (PRECATUR_CALL_OBJECT_NAMES as readonly string[]).includes(
    objectNameSingular,
  );

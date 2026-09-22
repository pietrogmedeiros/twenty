import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type PrecaturStageRule = ObjectRecord & {
  objectNameSingular: string | null;
  stageFieldName: string | null;
  stageValue: string | null;
  requiredFieldNames: string[] | null;
};

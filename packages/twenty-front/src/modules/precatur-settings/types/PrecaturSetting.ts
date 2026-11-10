import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type PrecaturSetting = ObjectRecord & {
  name: string | null;
  chave: string | null;
  valor: unknown;
};

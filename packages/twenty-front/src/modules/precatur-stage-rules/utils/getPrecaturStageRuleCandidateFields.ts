import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { FieldMetadataType, RelationType } from '~/generated-metadata/graphql';

// Tipos que o servidor sabe avaliar como "preenchido" e que a pessoa edita
const UNSUPPORTED_FIELD_TYPES = new Set<FieldMetadataType>([
  FieldMetadataType.ACTOR,
  FieldMetadataType.TS_VECTOR,
  FieldMetadataType.POSITION,
  FieldMetadataType.MORPH_RELATION,
]);

export const getPrecaturStageRuleCandidateFields = (
  fields: FieldMetadataItem[],
  stageFieldName: string,
) =>
  fields
    .filter(
      (field) =>
        field.isActive === true &&
        field.isSystem !== true &&
        field.name !== stageFieldName &&
        !UNSUPPORTED_FIELD_TYPES.has(field.type) &&
        // Só o lado "muitos para um" tem valor no próprio registro
        (field.type !== FieldMetadataType.RELATION ||
          field.relation?.type === RelationType.MANY_TO_ONE),
    )
    .sort((fieldA, fieldB) =>
      fieldA.label.localeCompare(fieldB.label, 'pt-BR'),
    );

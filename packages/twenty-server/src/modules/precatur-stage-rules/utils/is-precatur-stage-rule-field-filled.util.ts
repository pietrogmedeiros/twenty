import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const isNonBlankString = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const getCompositeProperty = (value: unknown, property: string): unknown =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[property]
    : undefined;

// "Preenchido" depende do tipo: um composto vazio ainda é um objeto, então
// olhamos a parte que o usuário realmente preenche em cada tipo.
export const isPrecaturStageRuleFieldFilled = (
  fieldType: FieldMetadataType,
  value: unknown,
): boolean => {
  if (!isDefined(value)) {
    return false;
  }

  switch (fieldType) {
    case FieldMetadataType.TEXT:
    case FieldMetadataType.UUID:
      return isNonBlankString(value);
    // Checkbox obrigatório = marcado ("Aceite = Sim"); falso sempre existe
    case FieldMetadataType.BOOLEAN:
      return value === true;
    case FieldMetadataType.CURRENCY:
      return isDefined(getCompositeProperty(value, 'amountMicros'));
    case FieldMetadataType.FULL_NAME:
      return (
        isNonBlankString(getCompositeProperty(value, 'firstName')) ||
        isNonBlankString(getCompositeProperty(value, 'lastName'))
      );
    case FieldMetadataType.EMAILS:
      return isNonBlankString(getCompositeProperty(value, 'primaryEmail'));
    case FieldMetadataType.PHONES:
      return isNonBlankString(
        getCompositeProperty(value, 'primaryPhoneNumber'),
      );
    case FieldMetadataType.LINKS:
      return isNonBlankString(getCompositeProperty(value, 'primaryLinkUrl'));
    case FieldMetadataType.ADDRESS:
      return [
        'addressStreet1',
        'addressCity',
        'addressPostcode',
        'addressState',
        'addressCountry',
      ].some((property) =>
        isNonBlankString(getCompositeProperty(value, property)),
      );
    case FieldMetadataType.RICH_TEXT:
      return (
        isNonBlankString(getCompositeProperty(value, 'markdown')) ||
        isNonBlankString(value)
      );
    case FieldMetadataType.MULTI_SELECT:
    case FieldMetadataType.ARRAY:
    case FieldMetadataType.FILES:
      return Array.isArray(value) && value.length > 0;
    case FieldMetadataType.RAW_JSON:
      return Array.isArray(value)
        ? value.length > 0
        : typeof value === 'object'
          ? Object.keys(value as object).length > 0
          : true;
    default:
      return !(typeof value === 'string' && value.trim().length === 0);
  }
};

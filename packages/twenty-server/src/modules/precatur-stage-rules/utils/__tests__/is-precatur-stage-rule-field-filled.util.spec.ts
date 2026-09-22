import { FieldMetadataType } from 'twenty-shared/types';

import { isPrecaturStageRuleFieldFilled } from 'src/modules/precatur-stage-rules/utils/is-precatur-stage-rule-field-filled.util';

describe('isPrecaturStageRuleFieldFilled', () => {
  it('should treat blank text as empty', () => {
    expect(isPrecaturStageRuleFieldFilled(FieldMetadataType.TEXT, '  ')).toBe(
      false,
    );
    expect(isPrecaturStageRuleFieldFilled(FieldMetadataType.TEXT, 'ok')).toBe(
      true,
    );
  });

  it('should require the checkbox to be checked', () => {
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.BOOLEAN, false),
    ).toBe(false);
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.BOOLEAN, true),
    ).toBe(true);
  });

  it('should look at the amount of a currency', () => {
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.CURRENCY, {
        amountMicros: null,
        currencyCode: 'BRL',
      }),
    ).toBe(false);
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.CURRENCY, {
        amountMicros: 0,
        currencyCode: 'BRL',
      }),
    ).toBe(true);
  });

  it('should look at the primary value of emails and phones', () => {
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.EMAILS, {
        primaryEmail: '',
        additionalEmails: [],
      }),
    ).toBe(false);
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.PHONES, {
        primaryPhoneNumber: '11999999999',
      }),
    ).toBe(true);
  });

  it('should treat empty multi select as empty and null as empty', () => {
    expect(
      isPrecaturStageRuleFieldFilled(FieldMetadataType.MULTI_SELECT, []),
    ).toBe(false);
    expect(isPrecaturStageRuleFieldFilled(FieldMetadataType.NUMBER, null)).toBe(
      false,
    );
    expect(isPrecaturStageRuleFieldFilled(FieldMetadataType.NUMBER, 0)).toBe(
      true,
    );
  });
});

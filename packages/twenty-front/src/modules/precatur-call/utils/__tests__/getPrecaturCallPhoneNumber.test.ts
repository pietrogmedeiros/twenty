import { getPrecaturCallPhoneNumber } from '@/precatur-call/utils/getPrecaturCallPhoneNumber';

describe('getPrecaturCallPhoneNumber', () => {
  it('should prefer the record phone', () => {
    expect(
      getPrecaturCallPhoneNumber({
        telefone: ' 33 9984-5173 ',
        cedente: {
          phones: {
            primaryPhoneNumber: '71999999999',
            primaryPhoneCallingCode: '+55',
          },
        },
      }),
    ).toBe('33 9984-5173');
  });

  it('should fall back to the cedente primary phone with calling code', () => {
    expect(
      getPrecaturCallPhoneNumber({
        telefone: '',
        cedente: {
          phones: {
            primaryPhoneNumber: '3399845173',
            primaryPhoneCallingCode: '+55',
          },
        },
      }),
    ).toBe('+55 3399845173');
  });

  it('should return empty when there is no phone anywhere', () => {
    expect(getPrecaturCallPhoneNumber({ telefone: '', cedente: null })).toBe(
      '',
    );
    expect(getPrecaturCallPhoneNumber(undefined)).toBe('');
  });
});

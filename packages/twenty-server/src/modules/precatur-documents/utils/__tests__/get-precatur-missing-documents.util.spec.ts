import { getPrecaturMissingDocuments } from 'src/modules/precatur-documents/utils/get-precatur-missing-documents.util';

const documentTypeLabelByValue = new Map([
  ['PROCESSO_PRECATORIO', 'Processo de precatório'],
  ['DOCUMENTO_PESSOAL', 'Documento pessoal'],
  ['ESPELHO_FISCAL', 'Espelho fiscal'],
]);

describe('getPrecaturMissingDocuments', () => {
  it('should list required document types that are not in the folder', () => {
    expect(
      getPrecaturMissingDocuments({
        ruleItems: [
          'numeroProcesso',
          'documento:PROCESSO_PRECATORIO',
          'documento:DOCUMENTO_PESSOAL',
        ],
        record: {},
        presentDocumentTypes: new Set(['DOCUMENTO_PESSOAL']),
        documentTypeLabelByValue,
      }),
    ).toEqual(['Processo de precatório']);
  });

  it('should require fiscal mirror only when a certificate is positive', () => {
    const ruleItems = ['documento:ESPELHO_FISCAL_SE_CERTIDAO_POSITIVA'];

    expect(
      getPrecaturMissingDocuments({
        ruleItems,
        record: { situacaoCertidaoUniao: 'NEGATIVA' },
        presentDocumentTypes: new Set(),
        documentTypeLabelByValue,
      }),
    ).toEqual([]);

    expect(
      getPrecaturMissingDocuments({
        ruleItems,
        record: { situacaoCertidaoUniao: 'POSITIVA' },
        presentDocumentTypes: new Set(),
        documentTypeLabelByValue,
      }),
    ).toEqual(['Espelho fiscal (há certidão positiva)']);

    expect(
      getPrecaturMissingDocuments({
        ruleItems,
        record: { situacaoCertidaoUniao: 'POSITIVA' },
        presentDocumentTypes: new Set(['ESPELHO_FISCAL']),
        documentTypeLabelByValue,
      }),
    ).toEqual([]);
  });
});

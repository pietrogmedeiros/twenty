import { getPrecaturStagesToValidate } from 'src/modules/precatur-stage-rules/utils/get-precatur-stages-to-validate.util';

const options = [
  'PRE_ANALISE_AUTOMATICA',
  'DIREITO_CREDITORIO',
  'DUE',
  'ANALISE_DEFINITIVA',
  'APROVADO',
  'COM_RESSALVAS',
  'REPROVADO',
].map((value, position) => ({ value, position }));
const outcomeStages = ['APROVADO', 'COM_RESSALVAS', 'REPROVADO', 'PERDIDO'];
const run = (currentValue: string | null, targetValue: string) =>
  getPrecaturStagesToValidate({
    options,
    currentValue,
    targetValue,
    outcomeStages,
  });

describe('getPrecaturStagesToValidate', () => {
  it('should accumulate skipped process stages when advancing', () => {
    expect(run('PRE_ANALISE_AUTOMATICA', 'ANALISE_DEFINITIVA')).toEqual([
      'DIREITO_CREDITORIO',
      'DUE',
      'ANALISE_DEFINITIVA',
    ]);
  });

  it('should only validate the outcome itself when deciding early', () => {
    expect(run('PRE_ANALISE_AUTOMATICA', 'APROVADO')).toEqual(['APROVADO']);
    expect(run('PRE_ANALISE_AUTOMATICA', 'REPROVADO')).toEqual(['REPROVADO']);
  });

  it('should validate the target stage when reopening from an outcome', () => {
    expect(run('APROVADO', 'DUE')).toEqual(['DUE']);
  });

  it('should allow going back between process stages', () => {
    expect(run('ANALISE_DEFINITIVA', 'DUE')).toEqual([]);
  });

  it('should not validate when the stage does not change', () => {
    expect(run('DUE', 'DUE')).toEqual([]);
  });

  it('should accumulate from an empty stage', () => {
    expect(run(null, 'DUE')).toEqual([
      'PRE_ANALISE_AUTOMATICA',
      'DIREITO_CREDITORIO',
      'DUE',
    ]);
  });
});

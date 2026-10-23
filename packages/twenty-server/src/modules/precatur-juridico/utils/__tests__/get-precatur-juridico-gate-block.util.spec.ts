import { getPrecaturJuridicoGateBlock } from 'src/modules/precatur-juridico/utils/get-precatur-juridico-gate-block.util';

const stageOptions = [
  { value: 'PROSPECCAO', position: 0 },
  { value: 'EM_NEGOCIACAO', position: 1 },
  { value: 'JURIDICO_NO_PIPELINE', position: 2 },
  { value: 'ACEITO', position: 3 },
  { value: 'PERDIDO', position: 4 },
  { value: 'FECHADO', position: 5 },
];

describe('getPrecaturJuridicoGateBlock', () => {
  it('should block leaving Jurídico forward while waiting for the decision', () => {
    expect(
      getPrecaturJuridicoGateBlock({
        stageOptions,
        currentStage: 'JURIDICO_NO_PIPELINE',
        targetStage: 'ACEITO',
        decision: 'AGUARDANDO',
      }),
    ).toBe('WAITING_DECISION');
  });

  it('should block skipping over Jurídico without an analysis', () => {
    expect(
      getPrecaturJuridicoGateBlock({
        stageOptions,
        currentStage: 'EM_NEGOCIACAO',
        targetStage: 'FECHADO',
        decision: null,
      }),
    ).toBe('WAITING_DECISION');
  });

  it('should release when approved or approved with caveats', () => {
    for (const decision of ['APROVADO', 'COM_RESSALVAS'] as const) {
      expect(
        getPrecaturJuridicoGateBlock({
          stageOptions,
          currentStage: 'JURIDICO_NO_PIPELINE',
          targetStage: 'ACEITO',
          decision,
        }),
      ).toBeNull();
    }
  });

  it('should report a rejected analysis', () => {
    expect(
      getPrecaturJuridicoGateBlock({
        stageOptions,
        currentStage: 'JURIDICO_NO_PIPELINE',
        targetStage: 'ACEITO',
        decision: 'REPROVADO',
      }),
    ).toBe('REJECTED');
  });

  it('should always allow going back, staying, or moving to Perdido', () => {
    for (const targetStage of [
      'EM_NEGOCIACAO',
      'JURIDICO_NO_PIPELINE',
      'PERDIDO',
    ]) {
      expect(
        getPrecaturJuridicoGateBlock({
          stageOptions,
          currentStage: 'JURIDICO_NO_PIPELINE',
          targetStage,
          decision: 'AGUARDANDO',
        }),
      ).toBeNull();
    }
  });

  it('should not affect deals already past Jurídico', () => {
    expect(
      getPrecaturJuridicoGateBlock({
        stageOptions,
        currentStage: 'ACEITO',
        targetStage: 'FECHADO',
        decision: null,
      }),
    ).toBeNull();
  });

  it('should do nothing when the workspace has no Jurídico stage', () => {
    expect(
      getPrecaturJuridicoGateBlock({
        stageOptions: stageOptions.filter(
          (option) => option.value !== 'JURIDICO_NO_PIPELINE',
        ),
        currentStage: 'EM_NEGOCIACAO',
        targetStage: 'FECHADO',
        decision: null,
      }),
    ).toBeNull();
  });
});

import { isDefined } from 'twenty-shared/utils';

type StageOption = { value: string; position: number };

// Etapas cujas regras valem para a mudança current → target
export const getPrecaturStagesToValidate = ({
  options,
  currentValue,
  targetValue,
  outcomeStages,
}: {
  options: StageOption[];
  currentValue: string | null | undefined;
  targetValue: string;
  outcomeStages: readonly string[];
}): string[] => {
  if (currentValue === targetValue) {
    return [];
  }

  const targetOption = options.find((option) => option.value === targetValue);

  if (!isDefined(targetOption)) {
    return [];
  }

  if (outcomeStages.includes(targetValue)) {
    return [targetValue];
  }

  if (isDefined(currentValue) && outcomeStages.includes(currentValue)) {
    return [targetValue];
  }

  const currentPosition =
    options.find((option) => option.value === currentValue)?.position ??
    -Infinity;

  // Voltar é sempre permitido
  if (targetOption.position <= currentPosition) {
    return [];
  }

  // Pular etapas não dribla a regra: acumula as etapas atravessadas
  return options
    .filter(
      (option) =>
        option.position > currentPosition &&
        option.position <= targetOption.position &&
        !outcomeStages.includes(option.value),
    )
    .map((option) => option.value);
};

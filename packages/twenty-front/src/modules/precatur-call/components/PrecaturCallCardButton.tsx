import { useOpenPrecaturCall } from '@/precatur-call/hooks/useOpenPrecaturCall';
import { IconPhone } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';

type PrecaturCallCardButtonProps = {
  recordId: string;
  objectNameSingular: string;
};

export const PrecaturCallCardButton = ({
  recordId,
  objectNameSingular,
}: PrecaturCallCardButtonProps) => {
  const { openPrecaturCall } = useOpenPrecaturCall();

  return (
    <LightIconButton
      Icon={IconPhone}
      accent="tertiary"
      title="Ligar"
      onClick={() => openPrecaturCall({ recordId, objectNameSingular })}
    />
  );
};

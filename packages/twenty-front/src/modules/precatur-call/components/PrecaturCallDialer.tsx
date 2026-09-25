import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { PrecaturCallKeypad } from '@/precatur-call/components/PrecaturCallKeypad';
import { PrecaturCallRoundButton } from '@/precatur-call/components/PrecaturCallRoundButton';
import { PrecaturCallSummary } from '@/precatur-call/components/PrecaturCallSummary';
import { PRECATUR_CALL_PROVIDER } from '@/precatur-call/constants/PrecaturCallProvider';
import { PRECATUR_CALL_STATUS_LABELS } from '@/precatur-call/constants/PrecaturCallStatusLabels';
import { useRegisterPrecaturCall } from '@/precatur-call/hooks/useRegisterPrecaturCall';
import { type PrecaturCallSession } from '@/precatur-call/types/PrecaturCallProvider';
import { type PrecaturCallResult } from '@/precatur-call/types/PrecaturCallResult';
import { type PrecaturCallStatus } from '@/precatur-call/types/PrecaturCallStatus';
import { type PrecaturCallTarget } from '@/precatur-call/types/PrecaturCallTarget';
import { formatPrecaturCallDuration } from '@/precatur-call/utils/formatPrecaturCallDuration';
import { getPrecaturCallPhoneNumber } from '@/precatur-call/utils/getPrecaturCallPhoneNumber';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  IconDialpad,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhone,
  IconPhoneOff,
  IconX,
} from 'twenty-ui/icon';
import { Button, LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const PHONE_FIELD_NAME = 'telefone';
const CEDENTE_FIELD_NAME = 'cedente';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const StyledMockBadge = styled.span`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledAvatar = styled.div<{ isCalling: boolean; isInCall: boolean }>`
  align-items: center;
  animation: ${({ isCalling }) =>
    isCalling
      ? 'precatur-call-pulse 0.9s ease-in-out infinite alternate'
      : 'none'};
  background: ${({ isInCall }) =>
    isInCall ? themeCssVariables.color.green : themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${themeCssVariables.font.color.inverted};
  display: flex;
  font-size: 28px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 80px;
  justify-content: center;
  width: 80px;

  @keyframes precatur-call-pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.08);
    }
  }
`;

const StyledIdentity = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledPhone = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledStatus = styled.span<{ isInCall: boolean }>`
  color: ${({ isInCall }) =>
    isInCall
      ? themeCssVariables.color.green
      : themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
`;

const StyledDigits = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  letter-spacing: 2px;
  min-height: 16px;
`;

const StyledControls = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[6]};
  justify-content: center;
`;

const StyledPhoneForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

type PrecaturCallDialerProps = {
  target: PrecaturCallTarget;
  onClose: () => void;
};

export const PrecaturCallDialer = ({
  target,
  onClose,
}: PrecaturCallDialerProps) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: target.objectNameSingular,
  });
  const hasActiveField = (fieldName: string) =>
    objectMetadataItem.fields.some(
      (field) => field.name === fieldName && field.isActive,
    );

  const { record, loading } = useFindOneRecord({
    objectNameSingular: target.objectNameSingular,
    objectRecordId: target.recordId,
    recordGqlFields: {
      id: true,
      name: true,
      ...(hasActiveField(PHONE_FIELD_NAME) ? { [PHONE_FIELD_NAME]: true } : {}),
      ...(hasActiveField(CEDENTE_FIELD_NAME)
        ? { [CEDENTE_FIELD_NAME]: { id: true, phones: true } }
        : {}),
    },
  });

  const recordName: string = record?.name ?? 'Contato';
  const recordPhone = getPrecaturCallPhoneNumber({
    telefone: record?.[PHONE_FIELD_NAME],
    cedente: record?.[CEDENTE_FIELD_NAME],
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<PrecaturCallStatus>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [dialedDigits, setDialedDigits] = useState('');
  const [durationInSeconds, setDurationInSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [wasAnswered, setWasAnswered] = useState(false);
  const [result, setResult] = useState<PrecaturCallResult>('NO_ANSWER');
  const [notes, setNotes] = useState('');

  const [session, setSession] = useState<PrecaturCallSession | null>(null);
  const [hasAutoDialed, setHasAutoDialed] = useState(false);

  const { registerPrecaturCall, isRegistering } = useRegisterPrecaturCall();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const handleStatusChange = (nextStatus: PrecaturCallStatus) => {
    setStatus(nextStatus);

    if (nextStatus === 'IN_CALL') {
      setWasAnswered(true);
      setResult('ANSWERED');
    }

    if (nextStatus === 'ENDED') {
      setEndedAt(new Date());
      setSession(null);
    }
  };

  const startCall = (numberToCall: string) => {
    setPhoneNumber(numberToCall);
    setStartedAt(new Date());
    setSession(
      PRECATUR_CALL_PROVIDER.startCall({
        phoneNumber: numberToCall,
        onStatusChange: handleStatusChange,
      }),
    );
  };

  // Clicou em Ligar: se o registro já tem telefone, disca na hora, como num
  // softphone. Sem telefone, espera o número ser digitado.
  useEffect(() => {
    if (loading || hasAutoDialed) {
      return;
    }
    setHasAutoDialed(true);

    if (isNonEmptyString(recordPhone)) {
      startCall(recordPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recordPhone, hasAutoDialed]);

  useEffect(() => {
    if (status !== 'IN_CALL') {
      return;
    }

    const interval = setInterval(() => {
      setDurationInSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Fechar o pop-up (ou trocar de página) nunca deixa chamada pendurada
  useEffect(() => () => session?.hangUp(), [session]);

  const handleHangUp = () => {
    session?.hangUp();
  };

  const handleToggleMute = () => {
    session?.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleDigit = (digit: string) => {
    session?.sendDigit(digit);
    setDialedDigits((previous) => `${previous}${digit}`);
  };

  const handleRegister = async () => {
    if (!isDefined(startedAt) || !isDefined(endedAt)) {
      return;
    }

    try {
      await registerPrecaturCall({
        target,
        recordName,
        phoneNumber,
        startedAt,
        endedAt,
        durationInSeconds,
        result,
        notes,
      });
      enqueueSuccessSnackBar({
        message: 'Ligação registrada no histórico e na agenda',
      });
      onClose();
    } catch {
      enqueueErrorSnackBar({ message: 'Não foi possível registrar a ligação' });
    }
  };

  const isCalling = status === 'DIALING' || status === 'RINGING';
  const isInCall = status === 'IN_CALL';
  const isCallActive = isCalling || isInCall;

  const statusLabel = isInCall
    ? formatPrecaturCallDuration(durationInSeconds)
    : status === 'ENDED'
      ? `${PRECATUR_CALL_STATUS_LABELS.ENDED} · ${formatPrecaturCallDuration(durationInSeconds)}${wasAnswered ? '' : ' · não atendida'}`
      : PRECATUR_CALL_STATUS_LABELS[status];

  return (
    <StyledContainer>
      <StyledHeader>
        <StyledMockBadge>
          Simulação · telefonia ainda não integrada
        </StyledMockBadge>
        {!isCallActive && (
          <LightIconButton Icon={IconX} accent="tertiary" onClick={onClose} />
        )}
      </StyledHeader>

      <StyledAvatar isCalling={isCalling} isInCall={isInCall}>
        {recordName.trim().charAt(0).toUpperCase()}
      </StyledAvatar>

      <StyledIdentity>
        <StyledName>{recordName}</StyledName>
        {isNonEmptyString(phoneNumber) && (
          <StyledPhone>{phoneNumber}</StyledPhone>
        )}
        <StyledStatus isInCall={isInCall}>
          {loading
            ? 'Carregando…'
            : status === 'IDLE'
              ? 'Negócio sem telefone cadastrado'
              : statusLabel}
        </StyledStatus>
      </StyledIdentity>

      {status === 'IDLE' && !loading && (
        <StyledPhoneForm>
          <SettingsTextInput
            instanceId="precatur-call-phone"
            label="Número para ligar"
            placeholder="(71) 99999-9999"
            value={phoneNumber}
            onChange={setPhoneNumber}
            fullWidth
          />
          <Button
            title="Ligar"
            Icon={IconPhone}
            accent="green"
            variant="primary"
            justify="center"
            fullWidth
            disabled={!isNonEmptyString(phoneNumber.trim())}
            onClick={() => startCall(phoneNumber.trim())}
          />
        </StyledPhoneForm>
      )}

      {isCallActive && (
        <>
          {isKeypadOpen && (
            <>
              <StyledDigits>{dialedDigits}</StyledDigits>
              <PrecaturCallKeypad onDigit={handleDigit} />
            </>
          )}
          <StyledControls>
            <PrecaturCallRoundButton
              Icon={isMuted ? IconMicrophoneOff : IconMicrophone}
              label={isMuted ? 'Sem áudio' : 'Mudo'}
              isActive={isMuted}
              onClick={handleToggleMute}
            />
            <PrecaturCallRoundButton
              Icon={IconDialpad}
              label="Teclado"
              isActive={isKeypadOpen}
              onClick={() => setIsKeypadOpen(!isKeypadOpen)}
            />
            <PrecaturCallRoundButton
              Icon={IconPhoneOff}
              label="Encerrar"
              isDanger
              onClick={handleHangUp}
            />
          </StyledControls>
        </>
      )}

      {status === 'ENDED' && (
        <PrecaturCallSummary
          result={result}
          notes={notes}
          isRegistering={isRegistering}
          onResultChange={setResult}
          onNotesChange={setNotes}
          onDiscard={onClose}
          onRegister={handleRegister}
        />
      )}
    </StyledContainer>
  );
};

import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { PRECATUR_SETTINGS } from '@/precatur-settings/constants/PrecaturSettings';
import { usePrecaturSetting } from '@/precatur-settings/hooks/usePrecaturSetting';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Select } from '@/ui/input/components/Select';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { IconUser } from 'twenty-ui/icon';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';

const getManagerId = (value: unknown) =>
  isDefined(value) &&
  typeof value === 'object' &&
  'workspaceMemberId' in value &&
  typeof value.workspaceMemberId === 'string'
    ? value.workspaceMemberId
    : null;

// Precatur: quem é avisado depois de 5 dias úteis cobrando documento
export const PrecaturDocumentReminderManagerSection = () => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const { isEnabled, loading, value, saveValue } = usePrecaturSetting({
    key: PRECATUR_SETTINGS.documentReminderManagerKey,
    label: 'Cobrança de documentos: gestor comercial',
  });

  if (!isEnabled) {
    return null;
  }

  const options = [
    { label: 'Ninguém (só registra no bate-papo)', value: null },
    ...currentWorkspaceMembers
      .map((member) => ({
        label:
          `${member.name.firstName} ${member.name.lastName}`.trim() ||
          member.userEmail,
        value: member.id,
        Icon: IconUser,
      }))
      .sort((optionA, optionB) =>
        optionA.label.localeCompare(optionB.label, 'pt-BR'),
      ),
  ];

  const handleChange = async (workspaceMemberId: string | null) => {
    try {
      await saveValue(
        isDefined(workspaceMemberId) ? { workspaceMemberId } : null,
      );
      enqueueSuccessSnackBar({ message: 'Gestor da cobrança salvo' });
    } catch {
      enqueueErrorSnackBar({ message: 'Não foi possível salvar o gestor' });
    }
  };

  return (
    <Section>
      <H2Title
        title="Cobrança de documentos"
        description="Enquanto faltar documento exigido para a Due, o responsável comercial é cobrado no bate-papo do negócio uma vez por dia útil, por 5 dias. Depois disso, a pessoa escolhida aqui é avisada uma única vez e a cobrança encerra."
      />
      <Select
        dropdownId="precatur-document-reminder-manager"
        label="Gestor comercial"
        fullWidth
        withSearchInput
        disabled={loading}
        value={getManagerId(value)}
        options={options}
        onChange={handleChange}
      />
    </Section>
  );
};

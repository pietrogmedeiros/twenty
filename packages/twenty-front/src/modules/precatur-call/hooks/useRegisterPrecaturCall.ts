import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { PRECATUR_CALL_RESULTS } from '@/precatur-call/constants/PrecaturCallResults';
import { type PrecaturCallResult } from '@/precatur-call/types/PrecaturCallResult';
import { type PrecaturCallTarget } from '@/precatur-call/types/PrecaturCallTarget';
import { formatPrecaturCallDuration } from '@/precatur-call/utils/formatPrecaturCallDuration';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';

// Campos criados pelo precatur-build/criar-agenda.mjs; só são preenchidos se
// existirem, para a ligação funcionar também em workspace sem a agenda.
const TASK_ACTIVITY_TYPE_FIELD_NAME = 'tipoAtividade';
const TASK_END_FIELD_NAME = 'terminoEm';
const CALL_ACTIVITY_TYPE = 'LIGACAO';

export type RegisterPrecaturCallParams = {
  target: PrecaturCallTarget;
  recordName: string;
  phoneNumber: string;
  startedAt: Date;
  endedAt: Date;
  durationInSeconds: number;
  result: PrecaturCallResult;
  notes: string;
};

export const useRegisterPrecaturCall = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { objectMetadataItem: taskMetadataItem } = useObjectMetadataItem({
    objectNameSingular: 'task',
  });
  const { createOneRecord: createTask } = useCreateOneRecord({
    objectNameSingular: 'task',
  });
  const { createOneRecord: createTaskTarget } = useCreateOneRecord({
    objectNameSingular: 'taskTarget',
  });

  const hasTaskField = (fieldName: string) =>
    taskMetadataItem.fields.some(
      (field) => field.name === fieldName && field.isActive,
    );

  const registerPrecaturCall = async ({
    target,
    recordName,
    phoneNumber,
    startedAt,
    endedAt,
    durationInSeconds,
    result,
    notes,
  }: RegisterPrecaturCallParams) => {
    const resultLabel =
      PRECATUR_CALL_RESULTS.find((option) => option.value === result)?.label ??
      result;

    const markdown = [
      `**Resultado:** ${resultLabel}`,
      `**Número:** ${phoneNumber}`,
      `**Duração:** ${formatPrecaturCallDuration(durationInSeconds)}`,
      ...(isNonEmptyString(notes.trim()) ? [notes.trim()] : []),
      '_Ligação simulada — provedor de telefonia ainda não definido._',
    ].join('\n\n');

    setIsRegistering(true);

    try {
      const task = await createTask({
        title: `Ligação — ${recordName}`,
        status: 'DONE',
        dueAt: startedAt.toISOString(),
        assigneeId: currentWorkspaceMember?.id ?? null,
        bodyV2: { blocknote: null, markdown },
        ...(hasTaskField(TASK_ACTIVITY_TYPE_FIELD_NAME)
          ? { [TASK_ACTIVITY_TYPE_FIELD_NAME]: CALL_ACTIVITY_TYPE }
          : {}),
        ...(hasTaskField(TASK_END_FIELD_NAME)
          ? { [TASK_END_FIELD_NAME]: endedAt.toISOString() }
          : {}),
      });

      await createTaskTarget({
        taskId: task.id,
        [getActivityTargetObjectFieldIdName({
          nameSingular: target.objectNameSingular,
        })]: target.recordId,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return { registerPrecaturCall, isRegistering };
};

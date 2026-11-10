// Valor gravado pela tela de configurações: { workspaceMemberId: "<uuid>" }
export const getPrecaturSettingWorkspaceMemberId = (
  value: unknown,
): string | null =>
  typeof value === 'object' &&
  value !== null &&
  'workspaceMemberId' in value &&
  typeof value.workspaceMemberId === 'string' &&
  value.workspaceMemberId !== ''
    ? value.workspaceMemberId
    : null;

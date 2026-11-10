import { getPrecaturSettingWorkspaceMemberId } from 'src/modules/precatur-document-reminders/utils/get-precatur-setting-workspace-member-id.util';

describe('getPrecaturSettingWorkspaceMemberId', () => {
  it('should read the member id', () => {
    expect(
      getPrecaturSettingWorkspaceMemberId({ workspaceMemberId: 'member-1' }),
    ).toBe('member-1');
  });

  it('should return null for empty or malformed values', () => {
    expect(getPrecaturSettingWorkspaceMemberId(null)).toBeNull();
    expect(getPrecaturSettingWorkspaceMemberId('member-1')).toBeNull();
    expect(
      getPrecaturSettingWorkspaceMemberId({ workspaceMemberId: '' }),
    ).toBeNull();
  });
});

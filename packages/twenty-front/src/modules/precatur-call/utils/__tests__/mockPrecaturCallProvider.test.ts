import { MOCK_PRECATUR_CALL_PROVIDER } from '@/precatur-call/utils/mockPrecaturCallProvider';

describe('MOCK_PRECATUR_CALL_PROVIDER', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should go from dialing to ringing to in call', () => {
    const onStatusChange = jest.fn();

    MOCK_PRECATUR_CALL_PROVIDER.startCall({
      phoneNumber: '+5571999999999',
      onStatusChange,
    });

    expect(onStatusChange).toHaveBeenLastCalledWith('DIALING');
    jest.advanceTimersByTime(1500);
    expect(onStatusChange).toHaveBeenLastCalledWith('RINGING');
    jest.advanceTimersByTime(3500);
    expect(onStatusChange).toHaveBeenLastCalledWith('IN_CALL');
  });

  it('should end once and stop the pending transitions when hanging up', () => {
    const onStatusChange = jest.fn();

    const session = MOCK_PRECATUR_CALL_PROVIDER.startCall({
      phoneNumber: '+5571999999999',
      onStatusChange,
    });

    session.hangUp();
    session.hangUp();
    jest.advanceTimersByTime(10000);

    expect(onStatusChange.mock.calls).toEqual([['DIALING'], ['ENDED']]);
  });
});

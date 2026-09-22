import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatReadState } from '@/precatur-chat/types/PrecaturChatReadState';
import { buildPrecaturChatInboxThreads } from '@/precatur-chat/utils/buildPrecaturChatInboxThreads';

const ME = 'member-me';
const OTHER = 'member-other';

const buildMessage = (
  overrides: Partial<PrecaturChatMessage>,
): PrecaturChatMessage => ({
  __typename: 'MensagemChat',
  id: overrides.id ?? 'message',
  body: 'oi',
  targetObjectNameSingular: 'negociacao',
  targetRecordId: 'deal-1',
  targetRecordLabel: 'Negócio 1',
  mentionedWorkspaceMemberIds: [],
  attachmentIds: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  createdBy: { source: 'MANUAL', workspaceMemberId: OTHER, name: 'Outro' },
  ...overrides,
});

const buildReadState = (lastReadAt: string): PrecaturChatReadState => ({
  __typename: 'LeituraChat',
  id: 'read',
  workspaceMemberId: ME,
  targetObjectNameSingular: 'negociacao',
  targetRecordId: 'deal-1',
  lastReadAt,
});

describe('buildPrecaturChatInboxThreads', () => {
  it('should count messages from others after my last read as unread', () => {
    const [thread] = buildPrecaturChatInboxThreads({
      messages: [
        buildMessage({ id: 'c', createdAt: '2026-09-22T12:00:00.000Z' }),
        buildMessage({ id: 'b', createdAt: '2026-09-22T11:00:00.000Z' }),
        buildMessage({ id: 'a', createdAt: '2026-09-22T09:00:00.000Z' }),
      ],
      myReadStates: [buildReadState('2026-09-22T10:00:00.000Z')],
      currentWorkspaceMemberId: ME,
    });

    expect(thread.unreadCount).toBe(2);
    expect(thread.lastMessage.id).toBe('c');
    expect(thread.isParticipant).toBe(true);
  });

  it('should not count my own messages as unread', () => {
    const [thread] = buildPrecaturChatInboxThreads({
      messages: [
        buildMessage({
          createdBy: { source: 'MANUAL', workspaceMemberId: ME, name: 'Eu' },
        }),
      ],
      myReadStates: [],
      currentWorkspaceMemberId: ME,
    });

    expect(thread.unreadCount).toBe(0);
    expect(thread.isParticipant).toBe(true);
  });

  it('should make me a participant when I am mentioned', () => {
    const [thread] = buildPrecaturChatInboxThreads({
      messages: [buildMessage({ mentionedWorkspaceMemberIds: [ME] })],
      myReadStates: [],
      currentWorkspaceMemberId: ME,
    });

    expect(thread.isParticipant).toBe(true);
    expect(thread.unreadCount).toBe(1);
  });

  it('should not report unread for threads I do not take part in', () => {
    const [thread] = buildPrecaturChatInboxThreads({
      messages: [buildMessage({})],
      myReadStates: [],
      currentWorkspaceMemberId: ME,
    });

    expect(thread.isParticipant).toBe(false);
    expect(thread.unreadCount).toBe(0);
  });
});

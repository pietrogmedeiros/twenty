import { buildPrecaturChatSystemMessage } from 'src/modules/precatur-chat/utils/build-precatur-chat-system-message.util';

describe('buildPrecaturChatSystemMessage', () => {
  it('should prefix the mentions and keep their ids', () => {
    const message = buildPrecaturChatSystemMessage({
      text: 'faltam documentos.',
      mentionedMembers: [
        { id: 'member-1', name: { firstName: 'Ana', lastName: 'Souza' } },
      ],
    });

    expect(message.body).toBe('@Ana Souza faltam documentos.');
    expect(message.mentionedWorkspaceMemberIds).toEqual(['member-1']);
  });

  it('should skip members without a name', () => {
    const message = buildPrecaturChatSystemMessage({
      text: 'aviso',
      mentionedMembers: [{ id: 'member-1', name: null }],
    });

    expect(message.body).toBe('aviso');
    expect(message.mentionedWorkspaceMemberIds).toEqual([]);
  });

  it('should cut the label at 80 characters', () => {
    const message = buildPrecaturChatSystemMessage({
      text: 'x'.repeat(200),
      mentionedMembers: [],
    });

    expect(message.name).toHaveLength(80);
  });
});

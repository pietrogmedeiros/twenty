import { getPrecaturChatMentionQuery } from '@/precatur-chat/utils/getPrecaturChatMentionQuery';

describe('getPrecaturChatMentionQuery', () => {
  it('should detect a mention being typed before the caret', () => {
    expect(getPrecaturChatMentionQuery('Oi @Jo')).toEqual({
      query: 'Jo',
      startIndex: 3,
    });
  });

  it('should accept accented names', () => {
    expect(getPrecaturChatMentionQuery('@Joã')?.query).toBe('Joã');
  });

  it('should ignore @ inside words such as e-mails', () => {
    expect(getPrecaturChatMentionQuery('mande para ana@precatur')).toBeNull();
  });

  it('should close the menu after a space', () => {
    expect(getPrecaturChatMentionQuery('Oi @Jony ')).toBeNull();
  });
});

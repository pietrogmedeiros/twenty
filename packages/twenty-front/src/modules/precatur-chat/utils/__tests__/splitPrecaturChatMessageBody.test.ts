import { splitPrecaturChatMessageBody } from '@/precatur-chat/utils/splitPrecaturChatMessageBody';

describe('splitPrecaturChatMessageBody', () => {
  it('should highlight only mentions of mentioned members', () => {
    expect(
      splitPrecaturChatMessageBody('Oi @Jony Ive e @Fulano', ['Jony Ive']),
    ).toEqual([
      { type: 'text', value: 'Oi ' },
      { type: 'mention', value: '@Jony Ive' },
      { type: 'text', value: ' e @Fulano' },
    ]);
  });

  it('should prefer the longest name when names share a prefix', () => {
    expect(
      splitPrecaturChatMessageBody('@Ana Maria Souza ok', [
        'Ana Maria',
        'Ana Maria Souza',
      ]),
    ).toEqual([
      { type: 'mention', value: '@Ana Maria Souza' },
      { type: 'text', value: ' ok' },
    ]);
  });

  it('should split links out of text', () => {
    expect(
      splitPrecaturChatMessageBody('veja https://precatur.pro/doc agora', []),
    ).toEqual([
      { type: 'text', value: 'veja ' },
      { type: 'link', value: 'https://precatur.pro/doc' },
      { type: 'text', value: ' agora' },
    ]);
  });
});

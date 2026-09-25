import { getChatwootIncomingMessagePhone } from 'src/modules/precatur-follow-up/utils/get-chatwoot-incoming-message-phone.util';

describe('getChatwootIncomingMessagePhone', () => {
  it('should return the sender phone of an incoming message', () => {
    expect(
      getChatwootIncomingMessagePhone({
        event: 'message_created',
        message_type: 'incoming',
        sender: { phone_number: '+5571999991234' },
      }),
    ).toBe('+5571999991234');
  });

  it('should fall back to the conversation sender', () => {
    expect(
      getChatwootIncomingMessagePhone({
        event: 'message_created',
        message_type: 0,
        conversation: { meta: { sender: { phone_number: '+5533998451730' } } },
      }),
    ).toBe('+5533998451730');
  });

  it('should ignore outgoing messages and other events', () => {
    expect(
      getChatwootIncomingMessagePhone({
        event: 'message_created',
        message_type: 'outgoing',
        sender: { phone_number: '+5571999991234' },
      }),
    ).toBeNull();
    expect(
      getChatwootIncomingMessagePhone({
        event: 'conversation_created',
        message_type: 'incoming',
        sender: { phone_number: '+5571999991234' },
      }),
    ).toBeNull();
  });
});

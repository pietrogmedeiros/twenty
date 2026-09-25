import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { type AxiosInstance } from 'axios';
import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

type ChatwootContact = {
  id: number;
  phone_number?: string | null;
};

type ChatwootConversation = {
  id: number;
  inbox_id: number;
  status: string;
};

export type PrecaturChatwootTemplateMessage = {
  phoneNumber: string;
  contactName: string;
  templateName: string;
  templateParams: string[];
  // Texto que aparece na conversa do Chatwoot junto com o template
  content: string;
};

// Envia templates aprovados do WhatsApp (API oficial) pelo Chatwoot, que já
// guarda a conversa para a equipe continuar o atendimento de lá.
@Injectable()
export class PrecaturChatwootService {
  private readonly logger = new Logger(PrecaturChatwootService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  getFollowUpTemplateNames(): string[] {
    return (this.twentyConfigService.get('PRECATUR_FOLLOW_UP_TEMPLATES') ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(isNonEmptyString);
  }

  isConfigured(): boolean {
    return (
      isNonEmptyString(this.twentyConfigService.get('PRECATUR_CHATWOOT_URL')) &&
      isNonEmptyString(
        this.twentyConfigService.get('PRECATUR_CHATWOOT_ACCOUNT_ID'),
      ) &&
      isNonEmptyString(
        this.twentyConfigService.get('PRECATUR_CHATWOOT_INBOX_ID'),
      ) &&
      isNonEmptyString(
        this.twentyConfigService.get('PRECATUR_CHATWOOT_API_TOKEN'),
      )
    );
  }

  async sendTemplateMessage(
    message: PrecaturChatwootTemplateMessage,
  ): Promise<void> {
    const client = this.getClient();
    const inboxId = Number(
      this.twentyConfigService.get('PRECATUR_CHATWOOT_INBOX_ID'),
    );

    const contactId = await this.findOrCreateContactId(client, {
      phoneNumber: message.phoneNumber,
      contactName: message.contactName,
      inboxId,
    });

    const templateParams = {
      name: message.templateName,
      category: 'MARKETING',
      language: this.twentyConfigService.get(
        'PRECATUR_FOLLOW_UP_TEMPLATE_LANGUAGE',
      ),
      processed_params: Object.fromEntries(
        message.templateParams.map((value, index) => [
          String(index + 1),
          value,
        ]),
      ),
    };

    const conversationId = await this.findOpenConversationId(client, {
      contactId,
      inboxId,
    });

    if (isDefined(conversationId)) {
      await client.post(`conversations/${conversationId}/messages`, {
        content: message.content,
        message_type: 'outgoing',
        template_params: templateParams,
      });

      return;
    }

    await client.post('conversations', {
      inbox_id: inboxId,
      contact_id: contactId,
      message: {
        content: message.content,
        template_params: templateParams,
      },
    });
  }

  private getClient(): AxiosInstance {
    const baseUrl = this.twentyConfigService
      .get('PRECATUR_CHATWOOT_URL')
      .replace(/\/+$/, '');
    const accountId = this.twentyConfigService.get(
      'PRECATUR_CHATWOOT_ACCOUNT_ID',
    );

    return this.secureHttpClientService.getHttpClient({
      baseURL: `${baseUrl}/api/v1/accounts/${accountId}/`,
      headers: {
        api_access_token: this.twentyConfigService.get(
          'PRECATUR_CHATWOOT_API_TOKEN',
        ),
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });
  }

  private async findOrCreateContactId(
    client: AxiosInstance,
    {
      phoneNumber,
      contactName,
      inboxId,
    }: { phoneNumber: string; contactName: string; inboxId: number },
  ): Promise<number> {
    const searchResponse = await client.get<{ payload: ChatwootContact[] }>(
      'contacts/search',
      { params: { q: phoneNumber } },
    );

    const existingContact = searchResponse.data.payload.find(
      (contact) => contact.phone_number === phoneNumber,
    );

    if (isDefined(existingContact)) {
      return existingContact.id;
    }

    this.logger.log('Creating Chatwoot contact for a follow-up');

    const createResponse = await client.post<{
      payload: { contact: ChatwootContact };
    }>('contacts', {
      inbox_id: inboxId,
      name: contactName,
      phone_number: phoneNumber,
    });

    return createResponse.data.payload.contact.id;
  }

  private async findOpenConversationId(
    client: AxiosInstance,
    { contactId, inboxId }: { contactId: number; inboxId: number },
  ): Promise<number | null> {
    const response = await client.get<{ payload: ChatwootConversation[] }>(
      `contacts/${contactId}/conversations`,
    );

    const openConversation = response.data.payload.find(
      (conversation) =>
        conversation.inbox_id === inboxId && conversation.status !== 'resolved',
    );

    return openConversation?.id ?? null;
  }
}

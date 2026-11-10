import { Injectable } from '@nestjs/common';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from 'src/modules/precatur-chat/constants/precatur-chat-object-names.constant';
import {
  buildPrecaturChatSystemMessage,
  type PrecaturChatMentionedMember,
} from 'src/modules/precatur-chat/utils/build-precatur-chat-system-message.util';
import { buildPrecaturJuridicoSystemActor } from 'src/modules/precatur-juridico/utils/build-precatur-juridico-system-actor.util';

// Precatur: mensagem do "Sistema" no bate-papo de um registro. Gravar pelo ORM
// dispara o listener do chat, que manda o e-mail para quem foi mencionado.
@Injectable()
export class PrecaturChatSystemMessageService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // Precisa rodar dentro de executeInWorkspaceContext
  async post({
    workspaceId,
    targetObjectNameSingular,
    targetRecordId,
    targetRecordLabel,
    mentionedMembers,
    text,
  }: {
    workspaceId: string;
    targetObjectNameSingular: string;
    targetRecordId: string;
    targetRecordLabel: string;
    mentionedMembers: PrecaturChatMentionedMember[];
    text: string;
  }) {
    const messageRepository =
      await this.globalWorkspaceOrmManager.getRepository<
        Record<string, unknown>
      >(workspaceId, PRECATUR_CHAT_MESSAGE_OBJECT_NAME, {
        shouldBypassPermissionChecks: true,
      });

    await messageRepository.save({
      ...buildPrecaturJuridicoSystemActor(),
      ...buildPrecaturChatSystemMessage({ text, mentionedMembers }),
      targetObjectNameSingular,
      targetRecordId,
      targetRecordLabel,
      attachmentIds: [],
    });
  }
}

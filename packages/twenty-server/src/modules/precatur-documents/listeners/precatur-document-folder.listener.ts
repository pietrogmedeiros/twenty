import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import {
  PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME,
  PRECATUR_DOCUMENT_FOLDER_RELATION_FIELD_NAME,
} from 'src/modules/precatur-documents/constants/precatur-documents.constants';
import { PrecaturDocumentFolderService } from 'src/modules/precatur-documents/services/precatur-document-folder.service';

type FolderRecord = Record<string, unknown> & { id: string };

const FOLDER_RELATION_ID_NAME = `${PRECATUR_DOCUMENT_FOLDER_RELATION_FIELD_NAME}Id`;

// Precatur: card que ganha (ou troca de) precatório leva os próprios anexos
// para a pasta do processo; na criação ainda não há anexos para mover
@Injectable()
export class PrecaturDocumentFolderListener {
  private readonly logger = new Logger(PrecaturDocumentFolderListener.name);

  constructor(
    private readonly precaturDocumentFolderService: PrecaturDocumentFolderService,
  ) {}

  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPDATED)
  async handleUpdatedEvent(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<FolderRecord>>,
  ) {
    const objectName = payload.objectMetadata.nameSingular;

    if (
      objectName === PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME ||
      objectName === 'attachment'
    ) {
      return;
    }

    const folderIdByRecordId = new Map<string, string>();

    for (const event of payload.events) {
      const folderId = event.properties.after?.[FOLDER_RELATION_ID_NAME];

      if (
        typeof folderId === 'string' &&
        event.properties.before?.[FOLDER_RELATION_ID_NAME] !== folderId
      ) {
        folderIdByRecordId.set(event.properties.after.id, folderId);
      }
    }

    if (folderIdByRecordId.size === 0) {
      return;
    }

    try {
      await this.precaturDocumentFolderService.moveRecordAttachmentsToFolder({
        workspaceId: payload.workspaceId,
        objectName,
        folderIdByRecordId,
      });
    } catch (error) {
      this.logger.error(
        `Document folder move failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

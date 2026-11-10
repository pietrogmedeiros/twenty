import { Injectable } from '@nestjs/common';

import { capitalize, isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';
import { type QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME,
  PRECATUR_DOCUMENT_FOLDER_RELATION_FIELD_NAME,
  PRECATUR_DOCUMENT_TYPE_FIELD_NAME,
} from 'src/modules/precatur-documents/constants/precatur-documents.constants';

type AttachmentRecord = Record<string, unknown> & { id: string };

type SelectOption = { value: string; label: string };

const getAttachmentTargetIdName = (objectName: string) =>
  `target${capitalize(objectName)}Id`;

const FOLDER_TARGET_ID_NAME = getAttachmentTargetIdName(
  PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME,
);

const FOLDER_RELATION_ID_NAME = `${PRECATUR_DOCUMENT_FOLDER_RELATION_FIELD_NAME}Id`;

export type PrecaturDocumentFolderContext = {
  documentTypeLabelByValue: Map<string, string>;
  hasRecordTarget: boolean;
};

// Precatur: lê e organiza a pasta de documentos do processo (anexos do
// Precatório + anexos do próprio card enquanto ele não tem precatório)
@Injectable()
export class PrecaturDocumentFolderService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // null = recurso não ativado no workspace (sem tipoDocumento no anexo ou
  // sem pasta do precatório)
  async getFolderContext(
    workspaceId: string,
    objectName: string,
  ): Promise<PrecaturDocumentFolderContext | null> {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );
    const attachmentObjectId = idByNameSingular.attachment;

    const attachmentObject = isDefined(attachmentObjectId)
      ? findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: attachmentObjectId,
          flatEntityMaps: flatObjectMetadataMaps,
        })
      : undefined;

    if (!isDefined(attachmentObject)) {
      return null;
    }

    const attachmentFields = getFlatFieldsFromFlatObjectMetadata(
      attachmentObject,
      flatFieldMetadataMaps,
    );

    const documentTypeField = attachmentFields.find(
      (field) => field.name === PRECATUR_DOCUMENT_TYPE_FIELD_NAME,
    );
    const hasFolderTarget = attachmentFields.some(
      (field) =>
        field.name ===
        `target${capitalize(PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME)}`,
    );

    if (!isDefined(documentTypeField) || !hasFolderTarget) {
      return null;
    }

    return {
      documentTypeLabelByValue: new Map(
        ((documentTypeField.options as SelectOption[] | null) ?? []).map(
          (option) => [option.value, option.label],
        ),
      ),
      hasRecordTarget:
        objectName !== PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME &&
        attachmentFields.some(
          (field) => field.name === `target${capitalize(objectName)}`,
        ),
    };
  }

  // Precisa rodar dentro de executeInWorkspaceContext
  async getDocumentTypesByRecordId({
    workspaceId,
    objectName,
    records,
    folderContext,
  }: {
    workspaceId: string;
    objectName: string;
    records: Record<string, unknown>[];
    folderContext: PrecaturDocumentFolderContext;
  }): Promise<Map<string, Set<string>>> {
    const folderIdByRecordId = new Map<string, string | null>(
      records.map((record) => [
        String(record.id),
        objectName === PRECATUR_DOCUMENT_FOLDER_OBJECT_NAME
          ? String(record.id)
          : ((record[FOLDER_RELATION_ID_NAME] as string | null | undefined) ??
            null),
      ]),
    );

    const folderIds = [...new Set(folderIdByRecordId.values())].filter(
      isDefined,
    );
    const recordTargetIdName = getAttachmentTargetIdName(objectName);
    const recordIds = folderContext.hasRecordTarget
      ? [...folderIdByRecordId.keys()]
      : [];

    const where = [
      ...(folderIds.length > 0
        ? [{ [FOLDER_TARGET_ID_NAME]: In(folderIds) }]
        : []),
      ...(recordIds.length > 0
        ? [{ [recordTargetIdName]: In(recordIds) }]
        : []),
    ];

    const typesByRecordId = new Map<string, Set<string>>(
      [...folderIdByRecordId.keys()].map((recordId) => [recordId, new Set()]),
    );

    if (where.length === 0) {
      return typesByRecordId;
    }

    const attachmentRepository =
      await this.globalWorkspaceOrmManager.getRepository<AttachmentRecord>(
        workspaceId,
        'attachment',
        { shouldBypassPermissionChecks: true },
      );

    const attachments = await attachmentRepository.find({ where });

    for (const [recordId, folderId] of folderIdByRecordId) {
      const types = typesByRecordId.get(recordId) ?? new Set<string>();

      for (const attachment of attachments) {
        const documentType = attachment[PRECATUR_DOCUMENT_TYPE_FIELD_NAME];
        const belongsToRecord =
          (isDefined(folderId) &&
            attachment[FOLDER_TARGET_ID_NAME] === folderId) ||
          attachment[recordTargetIdName] === recordId;

        if (belongsToRecord && typeof documentType === 'string') {
          types.add(documentType);
        }
      }
    }

    return typesByRecordId;
  }

  // Card ganhou precatório: o que foi anexado nele vai para a pasta do processo
  async moveRecordAttachmentsToFolder({
    workspaceId,
    objectName,
    folderIdByRecordId,
  }: {
    workspaceId: string;
    objectName: string;
    folderIdByRecordId: Map<string, string>;
  }) {
    if (folderIdByRecordId.size === 0) {
      return;
    }

    const folderContext = await this.getFolderContext(workspaceId, objectName);

    if (!isDefined(folderContext) || !folderContext.hasRecordTarget) {
      return;
    }

    const recordTargetIdName = getAttachmentTargetIdName(objectName);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const attachmentRepository =
        await this.globalWorkspaceOrmManager.getRepository<AttachmentRecord>(
          workspaceId,
          'attachment',
          { shouldBypassPermissionChecks: true },
        );

      for (const [recordId, folderId] of folderIdByRecordId) {
        await attachmentRepository.update({ [recordTargetIdName]: recordId }, {
          [FOLDER_TARGET_ID_NAME]: folderId,
          [recordTargetIdName]: null,
        } as QueryDeepPartialEntity<AttachmentRecord>);
      }
    }, buildSystemAuthContext(workspaceId));
  }
}

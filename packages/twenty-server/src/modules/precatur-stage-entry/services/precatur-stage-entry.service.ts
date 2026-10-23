import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { PRECATUR_STAGE_ENTRY_DATE_FIELD_NAME } from 'src/modules/precatur-stage-entry/constants/precatur-stage-entry.constants';

// Precatur: grava quando o registro entrou na etapa atual, para filtrar e
// ordenar por "entrada na etapa" (o Twenty só tem criado/atualizado em).
@Injectable()
export class PrecaturStageEntryService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async stampStageEntry({
    workspaceId,
    objectMetadata,
    recordIds,
    enteredAt = new Date(),
  }: {
    workspaceId: string;
    objectMetadata: FlatObjectMetadata;
    recordIds: string[];
    enteredAt?: Date;
  }) {
    if (
      recordIds.length === 0 ||
      !(await this.hasStageEntryField(workspaceId, objectMetadata))
    ) {
      return;
    }

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const repository = await this.globalWorkspaceOrmManager.getRepository<
        Record<string, unknown>
      >(workspaceId, objectMetadata.nameSingular, {
        shouldBypassPermissionChecks: true,
      });

      await repository.update(
        { id: In(recordIds) },
        { [PRECATUR_STAGE_ENTRY_DATE_FIELD_NAME]: enteredAt.toISOString() },
      );
    }, buildSystemAuthContext(workspaceId));
  }

  private async hasStageEntryField(
    workspaceId: string,
    objectMetadata: FlatObjectMetadata,
  ) {
    const { flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        { workspaceId, flatMapsKeys: ['flatFieldMetadataMaps'] },
      );

    return getFlatFieldsFromFlatObjectMetadata(
      objectMetadata,
      flatFieldMetadataMaps,
    ).some((field) => field.name === PRECATUR_STAGE_ENTRY_DATE_FIELD_NAME);
  }
}

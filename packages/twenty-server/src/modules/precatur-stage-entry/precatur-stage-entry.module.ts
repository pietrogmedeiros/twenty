import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PrecaturStageEntryListener } from 'src/modules/precatur-stage-entry/listeners/precatur-stage-entry.listener';
import { PrecaturStageEntryService } from 'src/modules/precatur-stage-entry/services/precatur-stage-entry.service';

// Precatur: data de entrada na etapa atual dos funis (filtro/ordenação)
@Module({
  imports: [WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [PrecaturStageEntryService, PrecaturStageEntryListener],
})
export class PrecaturStageEntryModule {}

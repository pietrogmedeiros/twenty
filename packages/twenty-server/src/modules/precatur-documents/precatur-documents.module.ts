import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PrecaturDocumentFolderListener } from 'src/modules/precatur-documents/listeners/precatur-document-folder.listener';
import { PrecaturDocumentFolderService } from 'src/modules/precatur-documents/services/precatur-document-folder.service';

// Precatur: pasta de documentos do processo (anexos do Precatório com tipo)
@Module({
  imports: [WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [PrecaturDocumentFolderService, PrecaturDocumentFolderListener],
  exports: [PrecaturDocumentFolderService],
})
export class PrecaturDocumentsModule {}

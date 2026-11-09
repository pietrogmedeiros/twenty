import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PrecaturDocumentsModule } from 'src/modules/precatur-documents/precatur-documents.module';
import { PrecaturStageRuleUpdateManyPreQueryHook } from 'src/modules/precatur-stage-rules/query-hooks/precatur-stage-rule.update-many.pre-query-hook';
import { PrecaturStageRuleUpdateOnePreQueryHook } from 'src/modules/precatur-stage-rules/query-hooks/precatur-stage-rule.update-one.pre-query-hook';
import { PrecaturStageRuleValidatorService } from 'src/modules/precatur-stage-rules/services/precatur-stage-rule-validator.service';

// Precatur: campos obrigatórios por etapa (regras configuradas pelo front)
@Module({
  imports: [
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
    PrecaturDocumentsModule,
  ],
  providers: [
    PrecaturStageRuleValidatorService,
    PrecaturStageRuleUpdateOnePreQueryHook,
    PrecaturStageRuleUpdateManyPreQueryHook,
  ],
})
export class PrecaturStageRulesModule {}

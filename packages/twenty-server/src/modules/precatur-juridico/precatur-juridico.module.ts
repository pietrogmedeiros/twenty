import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PrecaturJuridicoListener } from 'src/modules/precatur-juridico/listeners/precatur-juridico.listener';
import { PrecaturJuridicoUpdateManyPreQueryHook } from 'src/modules/precatur-juridico/query-hooks/precatur-juridico.update-many.pre-query-hook';
import { PrecaturJuridicoUpdateOnePreQueryHook } from 'src/modules/precatur-juridico/query-hooks/precatur-juridico.update-one.pre-query-hook';
import { PrecaturJuridicoGateService } from 'src/modules/precatur-juridico/services/precatur-juridico-gate.service';
import { PrecaturJuridicoService } from 'src/modules/precatur-juridico/services/precatur-juridico.service';

// Precatur: etapa "Jurídico" da Negociação espelhada na Análise Jurídica,
// com o negócio travado até a decisão do jurídico.
@Module({
  imports: [WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [
    PrecaturJuridicoService,
    PrecaturJuridicoGateService,
    PrecaturJuridicoListener,
    PrecaturJuridicoUpdateOnePreQueryHook,
    PrecaturJuridicoUpdateManyPreQueryHook,
  ],
})
export class PrecaturJuridicoModule {}

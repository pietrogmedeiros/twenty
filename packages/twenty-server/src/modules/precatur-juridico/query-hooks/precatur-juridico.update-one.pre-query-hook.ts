import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { PrecaturJuridicoGateService } from 'src/modules/precatur-juridico/services/precatur-juridico-gate.service';

@WorkspaceQueryHook(`negociacao.updateOne`)
export class PrecaturJuridicoUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly precaturJuridicoGateService: PrecaturJuridicoGateService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs,
  ): Promise<UpdateOneResolverArgs> {
    if (isDefined(payload.data)) {
      await this.precaturJuridicoGateService.validateStageChange({
        authContext,
        recordIds: [payload.id],
        data: payload.data,
      });
    }

    return payload;
  }
}

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { PrecaturStageRuleValidatorService } from 'src/modules/precatur-stage-rules/services/precatur-stage-rule-validator.service';
import { getRecordIdsFromFilter } from 'src/modules/precatur-stage-rules/utils/get-record-ids-from-filter.util';

@WorkspaceQueryHook(`*.updateMany`)
export class PrecaturStageRuleUpdateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly precaturStageRuleValidatorService: PrecaturStageRuleValidatorService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    objectName: string,
    payload: UpdateManyResolverArgs,
  ): Promise<UpdateManyResolverArgs> {
    if (isDefined(payload.data)) {
      await this.precaturStageRuleValidatorService.validateStageChange({
        authContext,
        objectName,
        recordIds: getRecordIdsFromFilter(payload.filter),
        data: payload.data,
      });
    }

    return payload;
  }
}

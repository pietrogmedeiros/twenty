import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
  PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
  PRECATUR_JURIDICO_PAYMENT_OBJECT_NAME,
  PRECATUR_JURIDICO_POST_PURCHASE_FIRST_STAGE,
  PRECATUR_JURIDICO_POST_PURCHASE_OBJECT_NAME,
} from 'src/modules/precatur-juridico/constants/precatur-juridico.constants';
import {
  type PrecaturJuridicoDeal,
  type PrecaturJuridicoPayment,
  type PrecaturJuridicoPostPurchase,
} from 'src/modules/precatur-juridico/types/precatur-juridico.types';
import { buildPrecaturJuridicoSystemActor } from 'src/modules/precatur-juridico/utils/build-precatur-juridico-system-actor.util';
import { isPrecaturJuridicoPaidToAssignor } from 'src/modules/precatur-juridico/utils/is-precatur-juridico-paid-to-assignor.util';

type PrecaturJuridicoPrecatorio = { id: string; name: string | null };

type PrecaturJuridicoAnalysisOwner = {
  id: string;
  negociacaoId: string | null;
  advogadoResponsavelId: string | null;
  createdAt: string;
};

@Injectable()
export class PrecaturJuridicoPostPurchaseService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // Um acompanhamento por pagamento ao cedente: ligado ao Precatório, ao
  // negócio (quando o precatório tem um só) e ao advogado da última análise.
  async openForPaidPayment(workspaceId: string, paymentId: string) {
    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const paymentRepository =
        await this.getRepository<PrecaturJuridicoPayment>(
          workspaceId,
          PRECATUR_JURIDICO_PAYMENT_OBJECT_NAME,
        );
      const postPurchaseRepository =
        await this.getRepository<PrecaturJuridicoPostPurchase>(
          workspaceId,
          PRECATUR_JURIDICO_POST_PURCHASE_OBJECT_NAME,
        );

      const payment = await paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!isDefined(payment) || !isPrecaturJuridicoPaidToAssignor(payment)) {
        return;
      }

      const existing = await postPurchaseRepository.findOne({
        where: { pagamentoId: paymentId },
      });

      if (isDefined(existing)) {
        return;
      }

      const { precatorio, dealId, responsibleId } = isDefined(
        payment.precatorioId,
      )
        ? await this.getPrecatorioContext(workspaceId, payment.precatorioId)
        : { precatorio: null, dealId: null, responsibleId: null };

      await postPurchaseRepository.save({
        ...buildPrecaturJuridicoSystemActor(),
        name: precatorio?.name ?? payment.name,
        etapa: PRECATUR_JURIDICO_POST_PURCHASE_FIRST_STAGE,
        pagamentoId: payment.id,
        precatorioId: payment.precatorioId,
        negociacaoId: dealId,
        responsavelJuridicoId: responsibleId,
      });
    }, buildSystemAuthContext(workspaceId));
  }

  private async getPrecatorioContext(
    workspaceId: string,
    precatorioId: string,
  ) {
    const precatorioRepository =
      await this.getRepository<PrecaturJuridicoPrecatorio>(
        workspaceId,
        'precatorio',
      );
    const dealRepository = await this.getRepository<PrecaturJuridicoDeal>(
      workspaceId,
      PRECATUR_JURIDICO_DEAL_OBJECT_NAME,
    );
    const analysisRepository =
      await this.getRepository<PrecaturJuridicoAnalysisOwner>(
        workspaceId,
        PRECATUR_JURIDICO_ANALYSIS_OBJECT_NAME,
      );

    const precatorio = await precatorioRepository.findOne({
      where: { id: precatorioId },
    });
    const deals = await dealRepository.find({ where: { precatorioId } });
    const [latestAnalysis] = await analysisRepository.find({
      where: { precatorioId },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    // Vários credores no mesmo precatório: sem como saber qual negócio foi pago
    const dealId = deals.length === 1 ? deals[0].id : null;

    return {
      precatorio,
      dealId,
      responsibleId: latestAnalysis?.advogadoResponsavelId ?? null,
    };
  }

  private getRepository<TRecord extends { id: string }>(
    workspaceId: string,
    objectName: string,
  ) {
    return this.globalWorkspaceOrmManager.getRepository<TRecord>(
      workspaceId,
      objectName,
      { shouldBypassPermissionChecks: true },
    );
  }
}

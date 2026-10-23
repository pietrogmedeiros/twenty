import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PrecaturJuridicoPostPurchaseService } from 'src/modules/precatur-juridico/services/precatur-juridico-post-purchase.service';
import { type PrecaturJuridicoPayment } from 'src/modules/precatur-juridico/types/precatur-juridico.types';

const WORKSPACE_ID = 'workspace-id';

const PAID_PAYMENT: PrecaturJuridicoPayment = {
  id: 'payment-id',
  name: 'Pagamento',
  tipo: 'PAGAMENTO_AO_CEDENTE',
  status: 'PAGO',
  precatorioId: 'precatorio-id',
};

const setup = ({
  payment = PAID_PAYMENT,
  existingPostPurchase = null,
  deals = [{ id: 'deal-id' }],
}: {
  payment?: PrecaturJuridicoPayment;
  existingPostPurchase?: { id: string } | null;
  deals?: { id: string }[];
} = {}) => {
  const repositories = {
    pagamento: { findOne: jest.fn().mockResolvedValue(payment) },
    acompanhamentoPosCompra: {
      findOne: jest.fn().mockResolvedValue(existingPostPurchase),
      save: jest.fn().mockResolvedValue(undefined),
    },
    precatorio: {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'precatorio-id', name: 'Precatório 123' }),
    },
    negociacao: { find: jest.fn().mockResolvedValue(deals) },
    analiseJuridica: {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'analysis-id', advogadoResponsavelId: 'member-id' },
        ]),
    },
  };

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getRepository: jest.fn(
      (_workspaceId: string, objectName: keyof typeof repositories) =>
        Promise.resolve(repositories[objectName]),
    ),
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new PrecaturJuridicoPostPurchaseService(globalWorkspaceOrmManager),
    repositories,
  };
};

describe('PrecaturJuridicoPostPurchaseService', () => {
  it('should open the follow-up when the assignor is paid', async () => {
    const { service, repositories } = setup();

    await service.openForPaidPayment(WORKSPACE_ID, PAID_PAYMENT.id);

    expect(repositories.acompanhamentoPosCompra.save).toHaveBeenCalledWith({
      name: 'Precatório 123',
      etapa: 'PETICIONAR_CESSAO',
      pagamentoId: 'payment-id',
      precatorioId: 'precatorio-id',
      negociacaoId: 'deal-id',
      responsavelJuridicoId: 'member-id',
    });
  });

  it('should not duplicate the follow-up of the same payment', async () => {
    const { service, repositories } = setup({
      existingPostPurchase: { id: 'existing-id' },
    });

    await service.openForPaidPayment(WORKSPACE_ID, PAID_PAYMENT.id);

    expect(repositories.acompanhamentoPosCompra.save).not.toHaveBeenCalled();
  });

  it('should leave the deal empty when the precatório has several creditors', async () => {
    const { service, repositories } = setup({
      deals: [{ id: 'deal-a' }, { id: 'deal-b' }],
    });

    await service.openForPaidPayment(WORKSPACE_ID, PAID_PAYMENT.id);

    expect(repositories.acompanhamentoPosCompra.save).toHaveBeenCalledWith(
      expect.objectContaining({ negociacaoId: null }),
    );
  });

  it('should ignore payments that are not a paid transfer to the assignor', async () => {
    const { service, repositories } = setup({
      payment: { ...PAID_PAYMENT, tipo: 'RECEBIMENTO_DO_ENTE' },
    });

    await service.openForPaidPayment(WORKSPACE_ID, PAID_PAYMENT.id);

    expect(repositories.acompanhamentoPosCompra.save).not.toHaveBeenCalled();
  });
});

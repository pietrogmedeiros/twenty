import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PrecaturJuridicoService } from 'src/modules/precatur-juridico/services/precatur-juridico.service';
import {
  type PrecaturJuridicoAnalysis,
  type PrecaturJuridicoDeal,
} from 'src/modules/precatur-juridico/types/precatur-juridico.types';

const WORKSPACE_ID = 'workspace-id';

const DEAL: PrecaturJuridicoDeal = {
  id: 'deal-id',
  name: 'Negociação — MARILZA',
  status: 'JURIDICO',
  precatorioId: 'precatorio-id',
  decisaoJuridica: null,
};

const buildAnalysis = (
  overrides: Partial<PrecaturJuridicoAnalysis> = {},
): PrecaturJuridicoAnalysis => ({
  id: 'analysis-id',
  name: 'Análise',
  status: 'EM_ANALISE',
  precatorioId: 'precatorio-id',
  negociacaoId: 'deal-id',
  createdAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

const setup = ({
  analysesByDeal = [],
  orphanAnalyses = [],
}: {
  analysesByDeal?: PrecaturJuridicoAnalysis[];
  orphanAnalyses?: PrecaturJuridicoAnalysis[];
}) => {
  const repositories = {
    negociacao: {
      findOne: jest.fn().mockResolvedValue(DEAL),
      update: jest.fn().mockResolvedValue(undefined),
    },
    analiseJuridica: {
      find: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          'negociacaoId' in where && where.negociacaoId === DEAL.id
            ? analysesByDeal
            : orphanAnalyses,
        ),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
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
    service: new PrecaturJuridicoService(globalWorkspaceOrmManager),
    repositories,
  };
};

describe('PrecaturJuridicoService', () => {
  describe('mirrorDealToJuridico', () => {
    it('should open a pending analysis linked to the deal and its precatório', async () => {
      const { service, repositories } = setup({});

      await service.mirrorDealToJuridico(WORKSPACE_ID, DEAL.id);

      expect(repositories.analiseJuridica.save).toHaveBeenCalledWith({
        name: DEAL.name,
        status: 'PENDENTE',
        negociacaoId: DEAL.id,
        precatorioId: DEAL.precatorioId,
      });
      expect(repositories.negociacao.update).toHaveBeenCalledWith(
        { id: DEAL.id },
        { decisaoJuridica: 'AGUARDANDO' },
      );
    });

    it('should reopen a rejected analysis instead of duplicating it', async () => {
      const { service, repositories } = setup({
        analysesByDeal: [buildAnalysis({ status: 'REPROVADO' })],
      });

      await service.mirrorDealToJuridico(WORKSPACE_ID, DEAL.id);

      expect(repositories.analiseJuridica.save).not.toHaveBeenCalled();
      expect(repositories.analiseJuridica.update).toHaveBeenCalledWith(
        { id: 'analysis-id' },
        { negociacaoId: DEAL.id, status: 'PENDENTE' },
      );
    });

    it('should keep an approved analysis valid when the deal comes back', async () => {
      const { service, repositories } = setup({
        analysesByDeal: [buildAnalysis({ status: 'APROVADO' })],
      });

      await service.mirrorDealToJuridico(WORKSPACE_ID, DEAL.id);

      expect(repositories.negociacao.update).toHaveBeenCalledWith(
        { id: DEAL.id },
        { decisaoJuridica: 'APROVADO' },
      );
    });

    it('should adopt an analysis imported only under the precatório', async () => {
      const { service, repositories } = setup({
        orphanAnalyses: [
          buildAnalysis({ id: 'imported-id', negociacaoId: null }),
        ],
      });

      await service.mirrorDealToJuridico(WORKSPACE_ID, DEAL.id);

      expect(repositories.analiseJuridica.save).not.toHaveBeenCalled();
      expect(repositories.analiseJuridica.update).toHaveBeenCalledWith(
        { id: 'imported-id' },
        { negociacaoId: DEAL.id, status: 'EM_ANALISE' },
      );
    });
  });

  describe('syncDecisionToDeal', () => {
    it('should send the deal to Recusado when the analysis is rejected', async () => {
      const { service, repositories } = setup({});

      await service.syncDecisionToDeal(WORKSPACE_ID, DEAL.id, 'REPROVADO');

      expect(repositories.negociacao.update).toHaveBeenCalledWith(
        { id: DEAL.id },
        { decisaoJuridica: 'REPROVADO', status: 'RECUSADO' },
      );
    });

    it('should only release the deal when approved with caveats', async () => {
      const { service, repositories } = setup({});

      await service.syncDecisionToDeal(WORKSPACE_ID, DEAL.id, 'COM_RESSALVAS');

      expect(repositories.negociacao.update).toHaveBeenCalledWith(
        { id: DEAL.id },
        { decisaoJuridica: 'COM_RESSALVAS' },
      );
    });
  });
});

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type PrecaturChatwootService } from 'src/modules/precatur-follow-up/services/precatur-chatwoot.service';
import { PrecaturFollowUpService } from 'src/modules/precatur-follow-up/services/precatur-follow-up.service';
import { type PrecaturFollowUpDeal } from 'src/modules/precatur-follow-up/types/precatur-follow-up-deal.type';

const WORKSPACE_ID = 'workspace-id';
const NOW = new Date('2026-09-26T12:00:00.000Z');

const buildDeal = (
  overrides: Partial<PrecaturFollowUpDeal> = {},
): PrecaturFollowUpDeal => ({
  id: 'deal-id',
  name: 'Negociação — MARILZA',
  status: 'EM_NEGOCIACAO',
  telefone: '33 9984-5173',
  cedenteId: null,
  responsavelComercialId: 'member-id',
  followUpStatus: 'ATIVO',
  followUpEnviados: 0,
  followUpProximoEm: '2026-09-26T12:00:00.000Z',
  followUpIniciadoEm: '2026-09-25T12:00:00.000Z',
  ...overrides,
});

const setup = ({
  deals,
  isChatwootConfigured = false,
}: {
  deals: PrecaturFollowUpDeal[];
  isChatwootConfigured?: boolean;
}) => {
  const repositories = {
    negociacao: {
      find: jest.fn().mockResolvedValue(deals),
      update: jest.fn().mockResolvedValue(undefined),
    },
    task: {
      save: jest
        .fn()
        .mockImplementation((task) =>
          Promise.resolve({ id: 'task-id', ...task }),
        ),
    },
    taskTarget: { save: jest.fn().mockResolvedValue(undefined) },
    person: { find: jest.fn().mockResolvedValue([]) },
  };

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getRepository: jest.fn(
      (_workspaceId: string, objectName: keyof typeof repositories) =>
        Promise.resolve(repositories[objectName]),
    ),
  } as unknown as GlobalWorkspaceOrmManager;

  const precaturChatwootService = {
    isConfigured: jest.fn().mockReturnValue(isChatwootConfigured),
    getFollowUpTemplateNames: jest
      .fn()
      .mockReturnValue(['followup_1', 'followup_2', 'followup_3']),
    sendTemplateMessage: jest.fn().mockResolvedValue(undefined),
  } as unknown as PrecaturChatwootService;

  return {
    service: new PrecaturFollowUpService(
      globalWorkspaceOrmManager,
      precaturChatwootService,
    ),
    repositories,
    precaturChatwootService,
  };
};

describe('PrecaturFollowUpService', () => {
  it('should log a simulated follow-up and schedule the next one when Chatwoot is not configured', async () => {
    const { service, repositories, precaturChatwootService } = setup({
      deals: [buildDeal()],
    });

    await service.processDueFollowUps(WORKSPACE_ID, NOW);

    expect(precaturChatwootService.sendTemplateMessage).not.toHaveBeenCalled();
    expect(repositories.task.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow-up 1 (simulação — WhatsApp não enviado)',
        status: 'DONE',
        tipoAtividade: 'FOLLOW_UP',
        assigneeId: 'member-id',
      }),
    );
    expect(repositories.taskTarget.save).toHaveBeenCalledWith({
      taskId: 'task-id',
      targetNegociacaoId: 'deal-id',
    });
    expect(repositories.negociacao.update).toHaveBeenCalledWith(
      { id: 'deal-id' },
      {
        followUpEnviados: 1,
        followUpProximoEm: '2026-09-28T12:00:00.000Z',
      },
    );
  });

  it('should send the matching template through Chatwoot when configured', async () => {
    const { service, precaturChatwootService } = setup({
      deals: [buildDeal({ followUpEnviados: 1 })],
      isChatwootConfigured: true,
    });

    await service.processDueFollowUps(WORKSPACE_ID, NOW);

    expect(precaturChatwootService.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: '+553399845173',
        templateName: 'followup_2',
      }),
    );
  });

  it('should create a call task and finish after the last follow-up', async () => {
    const { service, repositories } = setup({
      deals: [buildDeal({ followUpEnviados: 3 })],
    });

    await service.processDueFollowUps(WORKSPACE_ID, NOW);

    expect(repositories.task.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'TODO', tipoAtividade: 'LIGACAO' }),
    );
    expect(repositories.negociacao.update).toHaveBeenCalledWith(
      { id: 'deal-id' },
      { followUpStatus: 'CONCLUIDO', followUpProximoEm: null },
    );
  });

  it('should stop without sending when the deal has no phone', async () => {
    const { service, repositories } = setup({
      deals: [buildDeal({ telefone: '' })],
    });

    await service.processDueFollowUps(WORKSPACE_ID, NOW);

    expect(repositories.task.save).not.toHaveBeenCalled();
    expect(repositories.negociacao.update).toHaveBeenCalledWith(
      { id: 'deal-id' },
      { followUpStatus: 'SEM_TELEFONE', followUpProximoEm: null },
    );
  });

  it('should stop when the deal already left the stage', async () => {
    const { service, repositories } = setup({
      deals: [buildDeal({ status: 'FECHADO' })],
    });

    await service.processDueFollowUps(WORKSPACE_ID, NOW);

    expect(repositories.task.save).not.toHaveBeenCalled();
    expect(repositories.negociacao.update).toHaveBeenCalledWith(
      { id: 'deal-id' },
      { followUpStatus: 'SAIU_DA_ETAPA', followUpProximoEm: null },
    );
  });

  it('should mark deals as replied when the WhatsApp number matches without the ninth digit', async () => {
    const { service, repositories } = setup({
      deals: [buildDeal({ telefone: '(71) 99999-1234' })],
    });

    const repliedDeals = await service.markRepliedByPhone(
      WORKSPACE_ID,
      '+557199991234',
    );

    expect(repliedDeals).toBe(1);
    expect(repositories.negociacao.update).toHaveBeenCalledWith(
      { id: expect.anything() },
      { followUpStatus: 'RESPONDEU', followUpProximoEm: null },
    );
  });
});

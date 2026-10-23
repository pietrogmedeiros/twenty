import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { PrecaturStageEntryListener } from 'src/modules/precatur-stage-entry/listeners/precatur-stage-entry.listener';
import { type PrecaturStageEntryService } from 'src/modules/precatur-stage-entry/services/precatur-stage-entry.service';

const buildPayload = <TEvent>(nameSingular: string, events: TEvent[]) => ({
  name: `${nameSingular}.updated`,
  workspaceId: 'workspace-id',
  objectMetadata: { nameSingular } as FlatObjectMetadata,
  events,
});

const setup = () => {
  const precaturStageEntryService = {
    stampStageEntry: jest.fn().mockResolvedValue(undefined),
  };

  return {
    listener: new PrecaturStageEntryListener(
      precaturStageEntryService as unknown as PrecaturStageEntryService,
    ),
    stampStageEntry: precaturStageEntryService.stampStageEntry,
  };
};

const updateEvent = (
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) =>
  ({
    properties: {
      before: { id, ...before },
      after: { id, ...after },
      diff: Object.fromEntries(
        Object.keys(after)
          .filter((key) => before[key] !== after[key])
          .map((key) => [key, { before: before[key], after: after[key] }]),
      ),
    },
  }) as never;

describe('PrecaturStageEntryListener', () => {
  it('should stamp only records whose stage changed', async () => {
    const { listener, stampStageEntry } = setup();

    await listener.handleUpdatedEvent(
      buildPayload('negociacao', [
        updateEvent(
          'moved',
          { status: 'EM_NEGOCIACAO' },
          { status: 'JURIDICO' },
        ),
        updateEvent('edited', { name: 'A' }, { name: 'B' }),
      ]),
    );

    expect(stampStageEntry).toHaveBeenCalledWith(
      expect.objectContaining({ recordIds: ['moved'] }),
    );
  });

  it('should use the configured stage field of each funnel', async () => {
    const { listener, stampStageEntry } = setup();

    await listener.handleUpdatedEvent(
      buildPayload('acompanhamentoPosCompra', [
        updateEvent('case', { etapa: 'PETICIONAR' }, { etapa: 'HOMOLOGADA' }),
      ]),
    );

    expect(stampStageEntry).toHaveBeenCalledWith(
      expect.objectContaining({ recordIds: ['case'] }),
    );
  });

  it('should stamp records created already in a stage', async () => {
    const { listener, stampStageEntry } = setup();

    await listener.handleCreatedEvent(
      buildPayload('analiseJuridica', [
        { properties: { after: { id: 'new', status: 'PENDENTE' } } } as never,
      ]),
    );

    expect(stampStageEntry).toHaveBeenCalledWith(
      expect.objectContaining({ recordIds: ['new'] }),
    );
  });

  it('should ignore objects that are not funnels', async () => {
    const { listener, stampStageEntry } = setup();

    await listener.handleUpdatedEvent(
      buildPayload('person', [
        updateEvent('person-id', { status: 'A' }, { status: 'B' }),
      ]),
    );

    expect(stampStageEntry).not.toHaveBeenCalled();
  });
});

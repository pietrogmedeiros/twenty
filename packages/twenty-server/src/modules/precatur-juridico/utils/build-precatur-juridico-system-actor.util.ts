import { FieldActorSource } from 'twenty-shared/types';

// Objetos custom não têm default para createdByName/updatedByName (os padrão
// têm 'System'): insert pelo ORM sem autor é recusado pelo banco. A API
// preenche sozinha; aqui o autor é o próprio sistema.
export const buildPrecaturJuridicoSystemActor = () => {
  const actor = {
    source: FieldActorSource.SYSTEM,
    name: 'Sistema',
    workspaceMemberId: null,
    context: {},
  };

  return { createdBy: actor, updatedBy: actor };
};

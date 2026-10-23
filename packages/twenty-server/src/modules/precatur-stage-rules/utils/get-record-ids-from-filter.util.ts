type IdFilter = { id?: { in?: string[]; eq?: string } };

// Ações em massa do front mandam filtro por id; outros filtros não são
// traduzidos aqui e caem na mensagem de "selecione os registros"
export const getRecordIdsFromFilter = (filter: unknown): string[] | null => {
  const idFilter = (filter as IdFilter | null)?.id;

  if (Array.isArray(idFilter?.in)) {
    return idFilter.in;
  }

  if (typeof idFilter?.eq === 'string') {
    return [idFilter.eq];
  }

  return null;
};

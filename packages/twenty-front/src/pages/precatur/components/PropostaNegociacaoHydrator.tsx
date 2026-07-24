import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';

import { PropostaDocument } from '~/pages/precatur/components/PropostaDocument';
import { mapNegociacaoToProposta } from '~/pages/precatur/utils/mapNegociacaoToProposta';

// Precatur — busca a Negociação (com Precatório + Cedente aninhados, profundidade
// 1 por padrão) e mapeia para os dados do documento. Durante o load, o mapeamento
// de `undefined` cai para o mock, evitando tela vazia/erro.
export const PropostaNegociacaoHydrator = ({
  negociacaoId,
}: {
  negociacaoId: string;
}) => {
  const { record } = useFindOneRecord({
    objectNameSingular: 'negociacao',
    objectRecordId: negociacaoId,
  });

  return <PropostaDocument data={mapNegociacaoToProposta(record)} />;
};

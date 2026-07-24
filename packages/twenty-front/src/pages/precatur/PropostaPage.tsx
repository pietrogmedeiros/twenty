import { styled } from '@linaria/react';
import { useSearchParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconFileText, IconPrinter } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { PropostaDocument } from '~/pages/precatur/components/PropostaDocument';
import { PropostaNegociacaoHydrator } from '~/pages/precatur/components/PropostaNegociacaoHydrator';
import { PROPOSTA_DOCUMENT_STYLES } from '~/pages/precatur/constants/PropostaDocumentStyles';
import { MOCK_PROPOSAL_DATA } from '~/pages/precatur/utils/mapNegociacaoToProposta';

const NEGOCIACAO_OBJECT_NAME_SINGULAR = 'negociacao';

const StyledHeader = styled.header`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledTitle = styled.h1`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[1]} 0 0;
`;

// Precatur — página standalone do gerador de proposta (rota /precatur/proposta,
// fora do MainAppLayoutWithSidePanel). Mostra o preview ao vivo do documento e o
// botão "Gerar PDF" (window.print). Hidrata a partir de ?negociacaoId= quando o
// objeto Negociação existe; caso contrário usa dados de exemplo (mock).
export const PropostaPage = () => {
  const [searchParams] = useSearchParams();
  const negociacaoId = searchParams.get('negociacaoId') ?? undefined;

  const { objectMetadataItems } = useObjectMetadataItems();
  const negociacaoExists = objectMetadataItems.some(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === NEGOCIACAO_OBJECT_NAME_SINGULAR,
  );

  const shouldHydrate = isDefined(negociacaoId) && negociacaoExists;

  // Imprime usando o cliente como nome do arquivo: o Chrome usa document.title
  // como sugestão no "Salvar como PDF". Restaura o título após a impressão.
  const printProposal = () => {
    const previousTitle = document.title;
    document.title = 'Proposta';

    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };

    window.addEventListener('afterprint', restore);
    window.print();
  };

  return (
    <>
      <style>{PROPOSTA_DOCUMENT_STYLES}</style>
      <div className="proposta-page">
        <StyledHeader className="no-print">
          <div>
            <StyledTitle>
              <IconFileText size={24} />
              Gerar Proposta
            </StyledTitle>
            <StyledSubtitle>
              Monte a proposta de antecipação de precatório e gere o PDF (3
              páginas).
            </StyledSubtitle>
          </div>
          <Button
            Icon={IconPrinter}
            title="Gerar PDF"
            variant="primary"
            accent="blue"
            onClick={printProposal}
          />
        </StyledHeader>

        <div className="proposta-preview">
          <div className="proposta-preview-hint no-print">
            <IconFileText size={16} />
            Pré-visualização · 3 páginas
          </div>
          {shouldHydrate ? (
            <PropostaNegociacaoHydrator negociacaoId={negociacaoId} />
          ) : (
            <PropostaDocument data={MOCK_PROPOSAL_DATA} />
          )}
        </div>
      </div>
    </>
  );
};

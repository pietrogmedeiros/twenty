import { IconMail, IconPhone, IconWorld } from 'twenty-ui/icon';

import {
  formatProposalMoney,
  type ProposalData,
} from '~/pages/precatur/utils/mapNegociacaoToProposta';
import PrecaturLogoBranco from '~/pages/precatur/assets/precatur-logo-branco.png';

// Precatur — documento da proposta (3 páginas A4 paisagem), portado 1:1 do
// gerador original (~/Downloads/precatur/.../proposta/page.tsx). Só apresentação:
// recebe os dados já hidratados/mapeados e usa as classes .pp-* do <style> da rota.
export const PropostaDocument = ({ data }: { data: ProposalData }) => {
  return (
    <div className="proposal-doc">
      {/* Página 1 · Capa */}
      <section className="pp-page pp-cover">
        <div className="pp-cover-inner">
          <img
            src={PrecaturLogoBranco}
            alt="Precatur"
            className="pp-cover-logo"
          />
          <h1 className="pp-cover-title">
            Proposta de Antecipação de Precatórios
          </h1>
          <div className="pp-cover-meta">
            <div className="pp-cover-meta-row">
              <span>Cliente: {data.clientName || '—'}</span>
              <span>Data: {data.proposalDate || '—'}</span>
            </div>
            <div>Validade: {data.validade || '—'}</div>
          </div>
          <p className="pp-cover-tagline">
            Transforme seu crédito judicial em liquidez real.
          </p>
          <div className="pp-cover-rule" />
          <div className="pp-cover-stats">
            <div>Atuação nacional • Sede no Espírito Santo</div>
            <div>+R$ 250 milhões negociados • +500 operações em 2025</div>
          </div>
        </div>
      </section>

      {/* Página 2 · Como funciona / Quem atendemos */}
      <section className="pp-page">
        <div className="pp-band">
          <h2>Como funciona a antecipação</h2>
        </div>
        <div className="pp-band-rule" />
        <div className="pp-content-body">
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <div className="pp-step-title">Envio dos documentos</div>
              <div className="pp-step-desc">
                Você envia os dados e documentos do precatório para análise.
              </div>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <div className="pp-step-title">Análise jurídica</div>
              <div className="pp-step-desc">
                Avaliamos o crédito e preparamos uma proposta justa.
              </div>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <div className="pp-step-title">Contrato formal</div>
              <div className="pp-step-desc">
                Assinatura presencial ou online, 100% documentada em cartório.
              </div>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <div className="pp-step-title">Pagamento</div>
              <div className="pp-step-desc">
                Depósito na sua conta em até 24h úteis.
              </div>
            </div>
          </div>

          <h3 className="pp-h3">Quem atendemos</h3>
          <div className="pp-audience">
            <div className="pp-aud-card">
              <div className="pp-aud-title">Pessoas Físicas</div>
              <ul className="pp-aud-list">
                <li>Herdeiros e titulares de precatórios</li>
                <li>Indenizações, previdência e trabalhistas</li>
                <li>Quem precisa do valor agora</li>
              </ul>
            </div>
            <div className="pp-aud-card">
              <div className="pp-aud-title">Empresas</div>
              <ul className="pp-aud-list">
                <li>Valores retidos em precatórios</li>
                <li>Fluxo de caixa comprometido</li>
                <li>Cessão formal com assessoria jurídica</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Página 3 · Sua proposta personalizada */}
      <section className="pp-page">
        <div className="pp-band">
          <h2>Sua proposta personalizada</h2>
        </div>
        <div className="pp-band-rule" />
        <div className="pp-content-body">
          <div className="pp-rows">
            <div className="pp-row">
              <span className="pp-row-label">Tipo de precatório</span>
              <span className="pp-row-value">{data.naturezaLabel}</span>
            </div>
            <div className="pp-row">
              <span className="pp-row-label">Valor de face</span>
              <span className="pp-row-value">
                {formatProposalMoney(data.valorFace)}
              </span>
            </div>
            {data.showDesagio ? (
              <div className="pp-row">
                <span className="pp-row-label">Deságio aplicado</span>
                <span className="pp-row-value">
                  {data.desagioPercent.toFixed(1)}%
                </span>
              </div>
            ) : null}
            <div className="pp-row pp-row-highlight">
              <span className="pp-row-label">VALOR LÍQUIDO A RECEBER</span>
              <span className="pp-row-value">
                {formatProposalMoney(data.valorProposta)}
              </span>
            </div>
            <div className="pp-row">
              <span className="pp-row-label">Prazo de pagamento</span>
              <span className="pp-row-value">
                Até 24h úteis após assinatura
              </span>
            </div>
          </div>

          <div className="pp-cta">
            <div className="pp-cta-title">Vamos conversar?</div>
            <div className="pp-cta-row">
              <span className="pp-cta-item">
                <IconWorld /> www.precatur.com.br
              </span>
              <span className="pp-cta-item">
                <IconMail /> {data.responsavelEmail || '—'}
              </span>
              <span className="pp-cta-item">
                <IconPhone /> {data.responsavelPhone || '—'}
              </span>
            </div>
            <div className="pp-cta-sub">
              Análise gratuita e sem compromisso • Suporte completo • Atuação
              ética e transparente
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// oxlint-disable twenty/no-hardcoded-colors -- cores da identidade visual da
// Precatur, portadas 1:1 do documento original; o PDF deve ficar idêntico
// independentemente do tema (claro/escuro) do Twenty, então NÃO usar theme tokens.
// Precatur — CSS do documento da proposta, portado 1:1 do gerador original
// (~/Downloads/precatur/frontend/app/globals.css, bloco .proposal-doc / .pp-* /
// @media print). Injetado como <style> escopado à rota /precatur/proposta, então
// só existe enquanto a página está montada (equivalente a um global-style de rota).
// Mantém as container queries (cqw/cqh) e o @page A4 landscape exatamente como no
// original, para o documento ficar idêntico na tela e no papel.
export const PROPOSTA_DOCUMENT_STYLES = `
.proposta-page {
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 1120px;
  padding: 24px 16px 48px;
  /* Sob o DefaultLayout do Twenty, o container principal é altura-de-viewport com
     overflow:hidden. Sem uma região de scroll própria, as páginas 2 e 3 ficam
     clipadas. Como este bloco estica (flex align-items:stretch) até a altura do
     container, overflow-y:auto cria o scroll vertical. min-height:0 garante que o
     item flex possa encolher abaixo do conteúdo para o scroll ativar. */
  min-height: 0;
  overflow-y: auto;
}
.proposta-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.proposta-preview-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7680;
}

/* ===== .proposal-doc — 1:1 do globals.css ===== */
.proposal-doc {
  --dark: #10171a;
  --band: #2b3338;
  --teal: #2f8f92;
  --teal-deep: #14746f;
  --green: #14655a;
  --ink: #1c2427;
  --muted: #6b7680;
  --panel: #f1f3f4;
  --line: #dfe3e5;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.pp-page {
  position: relative;
  width: 100%;
  aspect-ratio: 297 / 210;
  background: #fff;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  container-type: size;
  font-size: 2.1cqw;
}
.pp-cover {
  background: radial-gradient(120% 90% at 50% 0%, #172226 0%, var(--dark) 60%);
  color: #e7ecee;
}
.pp-cover::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1.4cqw;
  background: linear-gradient(180deg, rgba(47, 143, 146, 0.55), rgba(47, 143, 146, 0.05));
}
.pp-cover-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8cqh 10cqw;
}
.pp-cover-logo {
  height: 13cqh;
  width: auto;
  margin-bottom: 3cqh;
}
.pp-cover-title {
  font-size: 4.2cqw;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--teal);
  margin-bottom: 4cqh;
}
.pp-cover-meta {
  display: flex;
  flex-direction: column;
  gap: 1.4cqh;
  font-size: 2.3cqw;
  color: #cbd3d6;
}
.pp-cover-meta .pp-cover-meta-row {
  display: flex;
  gap: 2.4cqw;
  justify-content: center;
}
.pp-cover-tagline {
  margin-top: 4cqh;
  font-size: 2.7cqw;
  color: #eef2f3;
}
.pp-cover-rule {
  width: 15cqw;
  height: 0.6cqh;
  border-radius: 999px;
  background: var(--teal);
  margin: 4cqh 0;
}
.pp-cover-stats {
  font-size: 1.9cqw;
  line-height: 1.7;
  color: var(--teal);
  opacity: 0.9;
}
.pp-band {
  background: var(--band);
  padding: 4cqh 6cqw;
}
.pp-band h2 {
  font-size: 4cqw;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
}
.pp-band-rule {
  height: 0.7cqh;
  background: var(--teal);
}
.pp-content-body {
  padding: 3.5cqh 6cqw;
}
.pp-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2cqw;
}
.pp-step {
  background: var(--panel);
  border-top: 0.9cqh solid var(--green);
  padding: 2.4cqh 1.6cqw;
  min-height: 26cqh;
}
.pp-step-num {
  font-size: 6cqw;
  font-weight: 800;
  color: var(--green);
  line-height: 1;
  margin-bottom: 1.4cqh;
}
.pp-step-title {
  font-size: 2cqw;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.8cqh;
}
.pp-step-desc {
  font-size: 1.7cqw;
  line-height: 1.4;
  color: var(--muted);
}
.pp-h3 {
  font-size: 3cqw;
  font-weight: 800;
  color: var(--ink);
  margin: 4cqh 0 2cqh;
}
.pp-audience {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2cqw;
}
.pp-aud-card {
  background: var(--panel);
  padding: 2.6cqh 2cqw;
  min-height: 18cqh;
}
.pp-aud-title {
  font-size: 2.2cqw;
  font-weight: 700;
  color: var(--green);
  margin-bottom: 1.4cqh;
}
.pp-aud-list {
  list-style: none;
  font-size: 1.8cqw;
  line-height: 1.7;
  color: var(--ink);
}
.pp-aud-list li::before {
  content: "\\2022 ";
  color: var(--ink);
}
.pp-rows {
  display: flex;
  flex-direction: column;
  gap: 0.9cqh;
}
.pp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2cqw;
  background: var(--panel);
  padding: 1.8cqh 3cqw;
}
.pp-row-label {
  font-size: 2.1cqw;
  font-weight: 700;
  color: var(--ink);
}
.pp-row-value {
  font-size: 2.1cqw;
  color: var(--muted);
  text-align: right;
}
.pp-row-highlight {
  background: var(--teal-deep);
}
.pp-row-highlight .pp-row-label {
  color: #fff;
}
.pp-row-highlight .pp-row-value {
  color: #fff;
  font-weight: 800;
  font-size: 2.6cqw;
}
.pp-cta {
  background: var(--band);
  margin-top: 1.5cqh;
  padding: 2cqh 3cqw;
}
.pp-cta-title {
  font-size: 2.6cqw;
  font-weight: 800;
  color: var(--teal);
  margin-bottom: 1cqh;
}
.pp-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2.4cqw;
  font-size: 1.7cqw;
  color: #eef2f3;
  margin-bottom: 1cqh;
}
.pp-cta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.8cqw;
}
.pp-cta-item svg {
  width: 1.9cqw;
  height: 1.9cqw;
  color: var(--teal);
  flex: none;
}
.pp-cta-sub {
  font-size: 1.7cqw;
  color: #aeb7ba;
}

/* ===== Impressão (A4 paisagem) — 1:1 do globals.css ===== */
@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }
  .no-print {
    display: none !important;
  }
  .proposta-page {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
    /* Neutraliza o scroll da tela: no papel o conteúdo deve fluir por completo,
       sem clipar nenhuma das 3 páginas A4. */
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  .proposta-page > * {
    margin-top: 0 !important;
  }
  .proposta-preview {
    position: static !important;
    margin: 0 !important;
    gap: 0 !important;
  }
  .proposal-doc {
    display: block !important;
    gap: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
  }
  .pp-page {
    width: 297mm !important;
    height: 210mm !important;
    aspect-ratio: auto !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .pp-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;

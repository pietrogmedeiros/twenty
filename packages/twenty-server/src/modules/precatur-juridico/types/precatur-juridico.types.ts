export type PrecaturJuridicoDeal = {
  id: string;
  name: string | null;
  status: string | null;
  precatorioId: string | null;
  decisaoJuridica: string | null;
};

export type PrecaturJuridicoAnalysis = {
  id: string;
  name: string | null;
  status: string | null;
  precatorioId: string | null;
  negociacaoId: string | null;
  createdAt: string;
};

export type PrecaturJuridicoPayment = {
  id: string;
  name: string | null;
  tipo: string | null;
  status: string | null;
  precatorioId: string | null;
};

export type PrecaturJuridicoPostPurchase = {
  id: string;
  name: string | null;
  etapa: string | null;
  pagamentoId: string | null;
  precatorioId: string | null;
  negociacaoId: string | null;
  responsavelJuridicoId: string | null;
};

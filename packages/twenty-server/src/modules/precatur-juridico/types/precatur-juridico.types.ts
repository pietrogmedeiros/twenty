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

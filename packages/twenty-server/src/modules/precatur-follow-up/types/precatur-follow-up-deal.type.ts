export type PrecaturFollowUpDeal = {
  id: string;
  name: string | null;
  status: string | null;
  telefone: string | null;
  cedenteId: string | null;
  responsavelComercialId: string | null;
  followUpStatus: string | null;
  followUpEnviados: number | null;
  followUpProximoEm: string | null;
  followUpIniciadoEm: string | null;
};

export type PrecaturFollowUpPerson = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  phones: {
    primaryPhoneNumber: string | null;
    primaryPhoneCallingCode: string | null;
  } | null;
};

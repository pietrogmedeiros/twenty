import { Img } from '@react-email/components';

const logoStyle = {
  marginBottom: '40px',
};

export const Logo = () => {
  return (
    <Img
      // Precatur: escudo servido pelo próprio CRM de produção
      src="https://crm.precatur.pro/images/icons/windows11/Square150x150Logo.scale-100.png"
      alt="Precatur"
      width="40"
      height="40"
      style={logoStyle}
    />
  );
};

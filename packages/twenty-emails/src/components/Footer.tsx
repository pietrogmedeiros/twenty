import { type I18n } from '@lingui/core';
import { Container } from '@react-email/components';
import { ShadowText } from 'src/components/ShadowText';

const footerContainerStyle = {
  marginTop: '12px',
};

type FooterProps = {
  i18n: I18n;
};

// Precatur: rodapé próprio no lugar dos links do Twenty (e-mails só em pt-BR)
export const Footer = (_props: FooterProps) => {
  return (
    <Container style={footerContainerStyle}>
      <ShadowText>
        <>
          Precatur — CRM
          <br />
          E-mail automático, não responda.
        </>
      </ShadowText>
    </Container>
  );
};

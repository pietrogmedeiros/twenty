import { Trans } from '@lingui/react';
import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { type APP_LOCALES } from 'twenty-shared/translations';

type SendEmailVerificationLinkEmailProps = {
  link: string;
  locale: keyof typeof APP_LOCALES;
  isEmailUpdate?: boolean;
};

export const SendEmailVerificationLinkEmail = ({
  link,
  locale,
  isEmailUpdate = false,
}: SendEmailVerificationLinkEmailProps) => {
  const i18n = createI18nInstance(locale);
  const title = isEmailUpdate
    ? i18n._('Confirm your new email address')
    : i18n._('Confirm your email address');
  const bodyId = isEmailUpdate
    ? 'Recebemos um pedido para trocar o e-mail da sua conta no CRM da Precatur. Clique abaixo para confirmar a troca.'
    : 'Obrigado por criar sua conta no CRM da Precatur! Antes de começar, precisamos confirmar que é você. Clique abaixo para verificar seu e-mail.';
  const ctaLabel = isEmailUpdate
    ? i18n._('Confirm new email')
    : i18n._('Verify Email');

  return (
    <BaseEmail width={333} locale={locale}>
      <Title value={title} />
      <MainText>
        <Trans id={bodyId} />
      </MainText>
      <br />
      <CallToAction href={link} value={ctaLabel} />
      <br />
      <br />
    </BaseEmail>
  );
};

SendEmailVerificationLinkEmail.PreviewProps = {
  link: 'https://app.twenty.com/verify-email/123',
  locale: 'en',
  isEmailUpdate: false,
};

export default SendEmailVerificationLinkEmail;

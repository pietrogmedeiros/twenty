import { splitPrecaturChatMessageBody } from '@/precatur-chat/utils/splitPrecaturChatMessageBody';
import { styled } from '@linaria/react';
import { getSafeUrl } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBody = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: ${themeCssVariables.text.lineHeight.lg};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledMention = styled.span`
  color: ${themeCssVariables.color.blue};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
`;

type PrecaturChatMessageBodyProps = {
  body: string;
  mentionedNames: string[];
};

export const PrecaturChatMessageBody = ({
  body,
  mentionedNames,
}: PrecaturChatMessageBodyProps) => {
  const parts = splitPrecaturChatMessageBody(body, mentionedNames);

  return (
    <StyledBody>
      {parts.map((part, index) => {
        switch (part.type) {
          case 'mention':
            return <StyledMention key={index}>{part.value}</StyledMention>;
          case 'link':
            return (
              <StyledLink
                key={index}
                href={getSafeUrl(part.value)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {part.value}
              </StyledLink>
            );
          default:
            return <span key={index}>{part.value}</span>;
        }
      })}
    </StyledBody>
  );
};

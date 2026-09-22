import { usePrecaturChatInbox } from '@/precatur-chat/hooks/usePrecaturChatInbox';
import { useIsPrecaturChatEnabled } from '@/precatur-chat/hooks/useIsPrecaturChatEnabled';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { styled } from '@linaria/react';
import { useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { IconMessageCircle } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledUnreadBadge = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.inverted};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 16px;
  min-width: 16px;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-align: center;
`;

export const PrecaturChatNavigationItem = () => {
  const isPrecaturChatEnabled = useIsPrecaturChatEnabled();

  if (!isPrecaturChatEnabled) {
    return null;
  }

  return <PrecaturChatNavigationItemContent />;
};

const PrecaturChatNavigationItemContent = () => {
  const location = useLocation();
  const { totalUnreadCount } = usePrecaturChatInbox({
    queryId: 'precatur-chat-navigation-unread',
  });

  return (
    <NavigationDrawerItem
      label="Bate-papos"
      to={AppPath.PrecaturChats}
      Icon={IconMessageCircle}
      active={location.pathname.startsWith(AppPath.PrecaturChats)}
      alwaysShowRightOptions={totalUnreadCount > 0}
      rightOptions={
        totalUnreadCount > 0 ? (
          <StyledUnreadBadge>
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </StyledUnreadBadge>
        ) : undefined
      }
    />
  );
};

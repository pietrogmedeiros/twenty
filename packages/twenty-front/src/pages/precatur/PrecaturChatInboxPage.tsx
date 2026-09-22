import { PrecaturChatInboxList } from '@/precatur-chat/components/PrecaturChatInboxList';
import { PrecaturChatThread } from '@/precatur-chat/components/PrecaturChatThread';
import { useIsPrecaturChatEnabled } from '@/precatur-chat/hooks/useIsPrecaturChatEnabled';
import { usePrecaturChatInbox } from '@/precatur-chat/hooks/usePrecaturChatInbox';
import { type PrecaturChatInboxThread } from '@/precatur-chat/types/PrecaturChatInboxThread';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import {
  IconExternalLink,
  IconMessageCircle,
  IconSearch,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const SELECTED_THREAD_SEARCH_PARAM = 'conversa';

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
`;

const StyledSidebar = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  width: 340px;
`;

const StyledSidebarTop = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSearch = styled.label`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledSearchInput = styled.input`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  outline: none;
`;

const StyledFilters = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFilter = styled.button<{ isActive: boolean }>`
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.transparent.medium : 'none'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const StyledConversation = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledConversationHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledConversationTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledRecordLink = styled(Link)`
  align-items: center;
  color: ${themeCssVariables.color.blue};
  display: flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;
`;

const StyledPlaceholder = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.md};
  justify-content: center;
  padding: ${themeCssVariables.spacing[6]};
  text-align: center;
`;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const PrecaturChatInbox = () => {
  const { threads } = usePrecaturChatInbox({
    queryId: 'precatur-chat-inbox-page',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(true);

  const selectedThreadKey = searchParams.get(SELECTED_THREAD_SEARCH_PARAM);
  const selectedThread = threads.find(
    (thread) => thread.key === selectedThreadKey,
  );

  const visibleThreads = threads.filter(
    (thread) =>
      (!showOnlyMine ||
        thread.isParticipant ||
        thread.key === selectedThreadKey) &&
      normalize(thread.targetRecordLabel).includes(normalize(searchText)),
  );

  const handleSelect = (thread: PrecaturChatInboxThread) => {
    setSearchParams({ [SELECTED_THREAD_SEARCH_PARAM]: thread.key });
  };

  return (
    <StyledBody>
      <StyledSidebar>
        <StyledSidebarTop>
          <StyledSearch>
            <IconSearch size={16} />
            <StyledSearchInput
              value={searchText}
              placeholder="Buscar conversa"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </StyledSearch>
          <StyledFilters>
            <StyledFilter
              type="button"
              isActive={showOnlyMine}
              onClick={() => setShowOnlyMine(true)}
            >
              Minhas conversas
            </StyledFilter>
            <StyledFilter
              type="button"
              isActive={!showOnlyMine}
              onClick={() => setShowOnlyMine(false)}
            >
              Todas
            </StyledFilter>
          </StyledFilters>
        </StyledSidebarTop>
        <StyledList>
          <PrecaturChatInboxList
            threads={visibleThreads}
            selectedThreadKey={selectedThreadKey}
            onSelect={handleSelect}
          />
        </StyledList>
      </StyledSidebar>
      <StyledConversation>
        {isDefined(selectedThread) ? (
          <>
            <StyledConversationHeader>
              <StyledConversationTitle>
                {selectedThread.targetRecordLabel}
              </StyledConversationTitle>
              <StyledRecordLink
                to={getAppPath(AppPath.RecordShowPage, {
                  objectNameSingular: selectedThread.targetObjectNameSingular,
                  objectRecordId: selectedThread.targetRecordId,
                })}
              >
                Ver registro
                <IconExternalLink size={14} />
              </StyledRecordLink>
            </StyledConversationHeader>
            <PrecaturChatThread
              key={selectedThread.key}
              targetObjectNameSingular={selectedThread.targetObjectNameSingular}
              targetRecordId={selectedThread.targetRecordId}
              targetRecordLabel={selectedThread.targetRecordLabel}
            />
          </>
        ) : (
          <StyledPlaceholder>
            Escolha uma conversa à esquerda.
            <br />
            Para começar uma nova, abra o registro e use a aba Chat.
          </StyledPlaceholder>
        )}
      </StyledConversation>
    </StyledBody>
  );
};

export const PrecaturChatInboxPage = () => {
  const isPrecaturChatEnabled = useIsPrecaturChatEnabled();

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          icon={<IconMessageCircle size={16} />}
          title="Bate-papos"
        />
      }
    >
      <PageTitle title="Bate-papos" />
      {isPrecaturChatEnabled ? (
        <PrecaturChatInbox />
      ) : (
        <StyledPlaceholder>
          O chat ainda não foi ativado neste workspace.
        </StyledPlaceholder>
      )}
    </PageCardLayout>
  );
};

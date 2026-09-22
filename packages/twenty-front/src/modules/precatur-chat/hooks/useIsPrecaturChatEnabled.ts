import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatMessageObjectName';
import { PRECATUR_CHAT_READ_STATE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatReadStateObjectName';

// O chat só existe nos workspaces onde o criar-chat.mjs rodou
export const useIsPrecaturChatEnabled = () => {
  const { objectMetadataItems } = useObjectMetadataItems();

  const hasObject = (nameSingular: string) =>
    objectMetadataItems.some(
      (objectMetadataItem) =>
        objectMetadataItem.nameSingular === nameSingular &&
        objectMetadataItem.isActive,
    );

  return (
    hasObject(PRECATUR_CHAT_MESSAGE_OBJECT_NAME) &&
    hasObject(PRECATUR_CHAT_READ_STATE_OBJECT_NAME)
  );
};

import { styled } from '@linaria/react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';

import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { AttachmentList } from '@/activities/files/components/AttachmentList';
import { DropZone } from '@/activities/files/components/DropZone';
import { useAttachments } from '@/activities/files/hooks/useAttachments';
import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { usePublishWidgetHeaderInfo } from '@/page-layout/widgets/hooks/usePublishWidgetHeaderInfo';
import { PrecaturDocumentTypePicker } from '@/precatur-documents/components/PrecaturDocumentTypePicker';
import { PRECATUR_DOCUMENT_FOLDER } from '@/precatur-documents/constants/PrecaturDocumentFolder';
import { usePrecaturDocumentFolder } from '@/precatur-documents/hooks/usePrecaturDocumentFolder';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { Trans, useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
} from 'twenty-ui/feedback';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const StyledAttachmentsContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: auto;
`;

const StyledFileInput = styled.input`
  display: none;
`;

const StyledDropZoneContainer = styled.div`
  height: 100%;
`;

export const FilesCard = () => {
  const targetRecord = useTargetRecord();
  const inputFileRef = useRef<HTMLInputElement>(null);
  // Precatur: pasta do processo = anexos do precatório ligado ao card
  const documentFolder = usePrecaturDocumentFolder(targetRecord);
  const { attachments, loading, totalCountAttachments } = useAttachments(
    documentFolder.displayTargets,
  );
  const { uploadAttachmentFile } = useUploadAttachmentFile();

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [filesWaitingForType, setFilesWaitingForType] = useState<File[]>([]);

  const { t } = useLingui();

  const uploadFiles = async (
    files: File[],
    additionalFields: Record<string, unknown> = {},
  ) => {
    for (const file of files) {
      await uploadAttachmentFile(
        file,
        documentFolder.uploadTarget,
        additionalFields,
      );
    }
  };

  const onUploadFiles = async (files: File[]) => {
    const hasDocumentTypes =
      (documentFolder.documentTypeOptions?.length ?? 0) > 0;

    if (hasDocumentTypes) {
      setFilesWaitingForType((previous) => [...previous, ...files]);
      return;
    }

    await uploadFiles(files);
  };

  const handleDocumentTypeSelected = async (documentType: string) => {
    const files = filesWaitingForType;

    setFilesWaitingForType([]);
    await uploadFiles(files, {
      [PRECATUR_DOCUMENT_FOLDER.documentTypeFieldName]: documentType,
    });
  };

  const documentTypePicker =
    filesWaitingForType.length > 0 &&
    isDefined(documentFolder.documentTypeOptions) ? (
      <PrecaturDocumentTypePicker
        files={filesWaitingForType}
        documentTypeOptions={documentFolder.documentTypeOptions}
        onSelect={handleDocumentTypeSelected}
        onCancel={() => setFilesWaitingForType([])}
      />
    ) : null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isDefined(e.target.files)) {
      onUploadFiles(Array.from(e.target.files));
    }
    // Permite escolher o mesmo arquivo de novo depois de cancelar
    e.target.value = '';
  };

  const handleUploadFileClick = () => {
    inputFileRef?.current?.click?.();
  };

  const isAttachmentsEmpty = attachments.length === 0;

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const hasObjectUpdatePermissions = objectPermissions.canUpdateObjectRecords;

  const hasUploadPermission = useHasPermissionFlag(
    PermissionFlagType.UPLOAD_FILE,
  );

  const canUploadFiles = hasObjectUpdatePermissions && hasUploadPermission;

  const addFileAction = useMemo(
    () =>
      canUploadFiles
        ? {
            Icon: IconPlus,
            label: t`Add file`,
            onClick: () => inputFileRef?.current?.click?.(),
          }
        : undefined,
    [canUploadFiles, t],
  );

  usePublishWidgetHeaderInfo({
    count: totalCountAttachments,
    primaryAction: addFileAction,
  });

  if (loading && isAttachmentsEmpty) {
    return <SkeletonLoader />;
  }

  if (isAttachmentsEmpty) {
    return (
      <StyledDropZoneContainer
        onDragEnter={() => canUploadFiles && setIsDraggingFile(true)}
      >
        {documentTypePicker}
        {isDraggingFile && canUploadFiles ? (
          <DropZone
            setIsDraggingFile={setIsDraggingFile}
            onUploadFiles={onUploadFiles}
          />
        ) : (
          <AnimatedPlaceholderEmptyContainer>
            <AnimatedPlaceholder type="noFile" />
            <AnimatedPlaceholderEmptyTextContainer>
              <AnimatedPlaceholderEmptyTitle>
                <Trans>No Files</Trans>
              </AnimatedPlaceholderEmptyTitle>
              <AnimatedPlaceholderEmptySubTitle>
                <Trans>There are no associated files with this record.</Trans>
              </AnimatedPlaceholderEmptySubTitle>
            </AnimatedPlaceholderEmptyTextContainer>
            <StyledFileInput
              ref={inputFileRef}
              onChange={handleFileChange}
              type="file"
              multiple
            />
            {canUploadFiles && (
              <Button
                Icon={IconPlus}
                title={t`Add file`}
                variant="secondary"
                onClick={handleUploadFileClick}
              />
            )}
          </AnimatedPlaceholderEmptyContainer>
        )}
      </StyledDropZoneContainer>
    );
  }

  return (
    <StyledAttachmentsContainer>
      <StyledFileInput
        ref={inputFileRef}
        onChange={handleFileChange}
        type="file"
        multiple
      />
      {documentTypePicker}
      <AttachmentList
        attachments={attachments ?? []}
        onUploadFiles={onUploadFiles}
        documentTypeOptions={documentFolder.documentTypeOptions}
      />
    </StyledAttachmentsContainer>
  );
};

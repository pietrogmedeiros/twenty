import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PrecaturChatModule } from 'src/modules/precatur-chat/precatur-chat.module';
import { PrecaturDocumentReminderCronCommand } from 'src/modules/precatur-document-reminders/crons/commands/precatur-document-reminder.cron.command';
import { PrecaturDocumentReminderCronJob } from 'src/modules/precatur-document-reminders/crons/jobs/precatur-document-reminder.cron.job';
import { PrecaturDocumentReminderListener } from 'src/modules/precatur-document-reminders/listeners/precatur-document-reminder.listener';
import { PrecaturDocumentReminderService } from 'src/modules/precatur-document-reminders/services/precatur-document-reminder.service';
import { PrecaturDocumentsModule } from 'src/modules/precatur-documents/precatur-documents.module';

// Precatur: cobrança diária dos documentos da Due no bate-papo do negócio
@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity]),
    PrecaturChatModule,
    PrecaturDocumentsModule,
  ],
  providers: [
    PrecaturDocumentReminderService,
    PrecaturDocumentReminderListener,
    PrecaturDocumentReminderCronJob,
    PrecaturDocumentReminderCronCommand,
  ],
  exports: [PrecaturDocumentReminderCronCommand],
})
export class PrecaturDocumentReminderModule {}

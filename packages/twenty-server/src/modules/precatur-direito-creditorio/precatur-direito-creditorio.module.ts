import { Module } from '@nestjs/common';

import { PrecaturChatModule } from 'src/modules/precatur-chat/precatur-chat.module';
import { PrecaturDireitoCreditorioListener } from 'src/modules/precatur-direito-creditorio/listeners/precatur-direito-creditorio.listener';
import { PrecaturDireitoCreditorioService } from 'src/modules/precatur-direito-creditorio/services/precatur-direito-creditorio.service';

// Precatur: workflow Direito creditório (crédito que ainda não virou precatório)
@Module({
  imports: [PrecaturChatModule],
  providers: [
    PrecaturDireitoCreditorioService,
    PrecaturDireitoCreditorioListener,
  ],
})
export class PrecaturDireitoCreditorioModule {}

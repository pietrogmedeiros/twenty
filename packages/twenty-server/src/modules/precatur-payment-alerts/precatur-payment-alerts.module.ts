import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PrecaturPaymentAlertsCronCommand } from 'src/modules/precatur-payment-alerts/crons/commands/precatur-payment-alerts.cron.command';
import { PrecaturPaymentAlertsCronJob } from 'src/modules/precatur-payment-alerts/crons/jobs/precatur-payment-alerts.cron.job';
import { PrecaturPaymentAlertsListener } from 'src/modules/precatur-payment-alerts/listeners/precatur-payment-alerts.listener';
import { PrecaturPaymentAlertsService } from 'src/modules/precatur-payment-alerts/services/precatur-payment-alerts.service';

// Precatur: tarefas na Agenda 6, 3 e 1 mês antes da previsão de pagamento
// dos Pós-Compra em "Aguardando pagamento"
@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity])],
  providers: [
    PrecaturPaymentAlertsService,
    PrecaturPaymentAlertsListener,
    PrecaturPaymentAlertsCronJob,
    PrecaturPaymentAlertsCronCommand,
  ],
  exports: [PrecaturPaymentAlertsCronCommand],
})
export class PrecaturPaymentAlertsModule {}

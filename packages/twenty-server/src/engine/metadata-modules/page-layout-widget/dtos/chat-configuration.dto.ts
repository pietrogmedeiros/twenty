import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type ChatConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

// Precatur: chat interno por registro (estilo bate-papo do Bitrix)
@ObjectType('ChatConfiguration')
export class ChatConfigurationDTO implements ChatConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.CHAT])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.CHAT;
}

import { Module } from '@nestjs/common';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CampaignService } from './application/campaign.service';
import { CampaignQueue } from './infrastructure/campaign-queue';
import { CampaignRepository } from './infrastructure/campaign.repository';
import { CampaignsController } from './interface/campaigns.controller';

@Module({
  // JwtAuthGuard + SessionManager (envio) + GuardrailService (gate de 1º contato — ABE-02)
  imports: [IamModule, SessionsModule, GuardrailModule],
  controllers: [CampaignsController],
  providers: [CampaignRepository, CampaignQueue, CampaignService],
})
export class CampaignsModule {}

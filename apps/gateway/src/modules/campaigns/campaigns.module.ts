import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CampaignService } from './application/campaign.service';
import { CampaignQueue } from './infrastructure/campaign-queue';
import { CampaignRepository } from './infrastructure/campaign.repository';
import { CampaignsController } from './interface/campaigns.controller';

@Module({
  imports: [IamModule, SessionsModule], // JwtAuthGuard + SessionManager (envio)
  controllers: [CampaignsController],
  providers: [CampaignRepository, CampaignQueue, CampaignService],
})
export class CampaignsModule {}

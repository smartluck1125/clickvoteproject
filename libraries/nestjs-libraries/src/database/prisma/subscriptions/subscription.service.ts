import { Injectable } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _integrationService: IntegrationService,
    private readonly _organizationService: OrganizationService
  ) {}

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(
      organizationId
    );
  }

  async deleteSubscription(customerId: string) {
    await this.modifySubscription(
      customerId,
      pricing.FREE.channel || 0,
      'FREE'
    );
    return this._subscriptionRepository.deleteSubscriptionByCustomerId(
      customerId
    );
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._subscriptionRepository.updateCustomerId(
      organizationId,
      customerId
    );
  }

  checkSubscription(organizationId: string, subscriptionId: string) {
    return this._subscriptionRepository.checkSubscription(
      organizationId,
      subscriptionId
    );
  }

  async modifySubscription(
    customerId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'PRO'
  ) {
    const getOrgByCustomerId = await this._subscriptionRepository.getOrganizationByCustomerId(customerId);

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      ))!;
    const from = pricing[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = pricing[billing];

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(
        getOrgByCustomerId?.id!
      )
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        getOrgByCustomerId?.id!,
        currentTotalChannels.length - totalChannels
      );
    }

    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        true
      );
    }

    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        false
      );
    }

    // if (to.faq < from.faq) {
    //   await this._faqRepository.deleteFAQs(getCurrentSubscription?.organizationId, from.faq - to.faq);
    // }
    // if (to.categories < from.categories) {
    //   await this._categoriesRepository.deleteCategories(getCurrentSubscription?.organizationId, from.categories - to.categories);
    // }
    // if (to.integrations < from.integrations) {
    //   await this._integrationsRepository.deleteIntegrations(getCurrentSubscription?.organizationId, from.integrations - to.integrations);
    // }
    // if (to.user < from.user) {
    //   await this._integrationsRepository.deleteUsers(getCurrentSubscription?.organizationId, from.user - to.user);
    // }
    // if (to.domains < from.domains) {
    //   await this._settingsService.deleteDomainByOrg(getCurrentSubscription?.organizationId);
    //   await this._organizationRepository.changePowered(getCurrentSubscription?.organizationId);
    // }
  }

  async createOrUpdateSubscription(
    identifier: string,
    customerId: string,
    totalChannels: number,
    billing: 'STANDARD' | 'PRO',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null
  ) {
    await this.modifySubscription(customerId, totalChannels, billing);
    return this._subscriptionRepository.createOrUpdateSubscription(
      identifier,
      customerId,
      totalChannels,
      billing,
      period,
      cancelAt
    );
  }

  async getSubscription(organizationId: string) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }
}

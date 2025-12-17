
import { supabaseApi } from './supabaseApi';

// Fallback version (should not be used, but required for TypeScript)
export class StripeService {
  async setupPayouts() {
    try {
      const result = await supabaseApi.createStripeConnectAccount();
      
      if (result.onboardingUrl) {
        console.log('Open Stripe onboarding:', result.onboardingUrl);
        return {
          needsOnboarding: true,
          onboardingUrl: result.onboardingUrl,
        };
      }

      return {
        needsOnboarding: false,
        payoutsEnabled: result.payoutsEnabled,
      };
    } catch (error) {
      console.error('Error setting up payouts:', error);
      throw error;
    }
  }

  async checkPayoutStatus() {
    try {
      const result = await supabaseApi.checkStripeAccountStatus();
      return {
        payoutsEnabled: result.payoutsEnabled,
        hasAccount: result.hasAccount,
        detailsSubmitted: result.detailsSubmitted,
      };
    } catch (error) {
      console.error('Error checking payout status:', error);
      throw error;
    }
  }

  async createPayment(jobId: string) {
    try {
      const result = await supabaseApi.createPayment(jobId);
      return {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
        platformFee: result.platformFee,
        workerAmount: result.workerAmount,
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async initPaymentSheet(options: any) {
    throw new Error('Stripe Payment Sheet requires platform-specific implementation');
  }

  async presentPaymentSheet() {
    throw new Error('Stripe Payment Sheet requires platform-specific implementation');
  }
}

export const stripeService = new StripeService();


import { supabaseApi } from './supabaseApi';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// CRITICAL: Stripe Payment Sheet platform detection
// Stripe Payment Sheet ONLY works on iOS/Android NATIVE BUILDS
// It does NOT work in: Expo Go, Web, or Simulators without native modules

// Platform-aware guard: Only import Stripe native modules on iOS/Android native builds
let initPaymentSheet: any = null;
let presentPaymentSheet: any = null;
let isStripeAvailable = false;

// Detect if we're in a native build (not Expo Go, not web)
const isNativeBuild = () => {
  // 1. Must be iOS or Android (not web)
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    console.log('❌ Stripe unavailable: Platform is', Platform.OS);
    return false;
  }
  
  // 2. Must be a real device or proper native build (not Expo Go)
  // Constants.appOwnership === 'standalone' means it's a native build
  // Constants.appOwnership === 'expo' means it's Expo Go
  const appOwnership = Constants.appOwnership;
  if (appOwnership === 'expo') {
    console.log('❌ Stripe unavailable: Running in Expo Go');
    return false;
  }
  
  // 3. Check if it's a real device (not simulator without native modules)
  const isRealDevice = Device.isDevice;
  console.log('📱 Device check:', { isRealDevice, appOwnership });
  
  // Allow both real devices and simulators in standalone builds
  // (simulators in standalone builds have native modules)
  return appOwnership === 'standalone' || appOwnership === null;
};

// Only import Stripe native modules if we're in a native build
if (isNativeBuild()) {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    initPaymentSheet = stripeModule.initPaymentSheet;
    presentPaymentSheet = stripeModule.presentPaymentSheet;
    isStripeAvailable = true;
    console.log('✅ Stripe native modules loaded successfully');
  } catch (error) {
    console.warn('⚠️ Stripe native modules not available:', error);
    isStripeAvailable = false;
  }
} else {
  console.log('⚠️ Stripe Payment Sheet not available in this environment');
  isStripeAvailable = false;
}

export class StripeService {
  async setupPayouts() {
    try {
      const result = await supabaseApi.createStripeConnectAccount();
      
      if (result.onboardingUrl) {
        // Open the Stripe onboarding URL
        // In a real app, you would use Linking.openURL or WebBrowser.openBrowserAsync
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
    // CRITICAL GUARD: Check if Stripe native modules are available
    // This prevents crashes in Expo Go and web environments
    if (!isStripeAvailable || !initPaymentSheet) {
      console.error('❌ Stripe Payment Sheet not available on this platform');
      console.log('💡 Payments are only available in the production app (iOS/Android native builds)');
      
      // Return error object WITHOUT throwing - this prevents crashes
      return { 
        error: { 
          message: 'Payments are available in the production app. Please use a native build to process payments.' 
        } 
      };
    }

    try {
      console.log('💳 Initializing Stripe Payment Sheet...');
      const result = await initPaymentSheet(options);
      console.log('✅ Payment Sheet initialized');
      return result;
    } catch (error: any) {
      console.error('❌ Error initializing payment sheet:', error);
      return { error: { message: error.message || 'Failed to initialize payment sheet' } };
    }
  }

  async presentPaymentSheet() {
    // CRITICAL GUARD: Check if Stripe native modules are available
    // This prevents crashes in Expo Go and web environments
    if (!isStripeAvailable || !presentPaymentSheet) {
      console.error('❌ Stripe Payment Sheet not available on this platform');
      console.log('💡 Payments are only available in the production app (iOS/Android native builds)');
      
      // Return error object WITHOUT throwing - this prevents crashes
      return { 
        error: { 
          message: 'Payments are available in the production app. Please use a native build to process payments.' 
        } 
      };
    }

    try {
      console.log('💳 Presenting Stripe Payment Sheet...');
      const result = await presentPaymentSheet();
      console.log('✅ Payment Sheet presented');
      return result;
    } catch (error: any) {
      console.error('❌ Error presenting payment sheet:', error);
      return { error: { message: error.message || 'Failed to present payment sheet' } };
    }
  }
}

export const stripeService = new StripeService();

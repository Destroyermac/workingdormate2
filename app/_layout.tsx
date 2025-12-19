
import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { notificationService } from "@/services/notificationService";
import Toast from 'react-native-toast-message';

// Conditionally import StripeProvider only on native platforms (not web, not Expo Go)
// This prevents "OnrampSdk could not be found" errors
let StripeProvider: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    StripeProvider = stripeModule.StripeProvider;
    console.log('✅ Stripe module loaded successfully');
  } catch (error) {
    console.warn('⚠️ Stripe module not available (Expo Go or web):', error);
  }
}

// Loading screen component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" }}>
      <ActivityIndicator size="large" color="#2A5EEA" />
      <Text style={{ marginTop: 16, fontSize: 16, color: "#475569" }}>Loading...</Text>
    </View>
  );
}

// Inner layout that has access to auth context
function RootLayoutInner() {
  const { isLoading, isAuthenticated } = useAuth();

  // Register for push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('📱 Registering for push notifications...');
      notificationService.registerForPushNotifications()
        .then((token) => {
          if (token) {
            console.log('✅ Push notification token registered:', token.substring(0, 20) + '...');
          } else {
            console.log('⚠️ Push notifications not available');
          }
        })
        .catch((error) => {
          console.error('❌ Error registering for push notifications:', error);
        });

      // Listen for notifications
      const notificationListener = notificationService.addNotificationReceivedListener((notification) => {
        console.log('📬 Notification received:', notification);
      });

      const responseListener = notificationService.addNotificationResponseReceivedListener((response) => {
        console.log('👆 Notification tapped:', response);
        // Handle notification tap - navigate to relevant screen
        const data = response.notification.request.content.data;
        if (data?.screen) {
          console.log('🔗 Navigate to:', data.screen);
          // Navigation will be handled by the app
        }
      });

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [isAuthenticated]);

  // Show loading screen while auth is initializing
  if (isLoading) {
    console.log("🔒 Auth still loading, showing loading screen");
    return <LoadingScreen />;
  }

  console.log("✅ Auth ready, rendering app");
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="post-job" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="payments" options={{ headerShown: false }} />
        <Stack.Screen name="receipts" options={{ headerShown: false }} />
        <Stack.Screen name="receipts/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="payment-receipt/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="legal/contact-support" options={{ headerShown: false }} />
      </Stack>
      {/* Toast component must be rendered at the root level to display toasts throughout the app */}
      <Toast />
    </>
  );
}

// Root layout with AuthProvider and optional StripeProvider
export default function RootLayout() {
  console.log("🚀 RootLayout rendering");
  console.log("📱 Platform:", Platform.OS);
  console.log("💳 Stripe available:", !!StripeProvider);
  
  // Wrap with StripeProvider only on native platforms where it's available
  if (StripeProvider && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    // Get Stripe publishable key from environment or use a placeholder
    // In production, this should come from your environment variables
    const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SVMycB6vmqskvV1XVGLTEoKVvry0tjMOQlBwMoHGerQXCQIk0Phuw7OvOApR4LjQyjYhoXZ96xEp8r5CiSmzreF00IJSPrAsQ';
    
    console.log('✅ Initializing with Stripe support');
    return (
      <StripeProvider publishableKey={stripePublishableKey}>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </StripeProvider>
    );
  }
  
  // Web or Expo Go fallback without Stripe native modules
  console.log('⚠️ Running without Stripe native support (web or Expo Go)');
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

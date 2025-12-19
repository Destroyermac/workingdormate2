
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import { isAllowedCampusEmail, getCampusFromEmail } from "@/constants/campus";

type SignupStep = 'email' | 'verify' | 'create-account' | 'terms';

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collegeName, setCollegeName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      setIsLoading(true);
      console.log('📧 Sending verification email to:', email);

      // Validate email is from an allowed campus
      const isAllowed = await isAllowedCampusEmail(email);
      if (!isAllowed) {
        showAlert('Invalid Email', 'This email domain is not from one of our supported schools. Please use your official college .edu email address.');
        setIsLoading(false);
        return;
      }

      const campus = await getCampusFromEmail(email);
      console.log('🎓 Campus detected:', campus?.name);

      // Call the send-verification-email edge function
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { email: email.trim() },
      });

      if (error) {
        console.error('❌ Send verification error:', error);
        showAlert('Error', error.message || 'Failed to send verification email');
        setIsLoading(false);
        return;
      }

      console.log('✅ Verification email sent:', data);
      
      if (data.college) {
        setCollegeName(data.college.name);
      }

      showAlert(
        'Verification Code Sent',
        'Please check your email for the 6-digit verification code.'
      );

      setStep('verify');
    } catch (err: any) {
      console.error('❌ Send verification exception:', err);
      showAlert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Verifying OTP for:', email);

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        showAlert('Invalid Code', 'Please enter a 6-digit verification code');
        setIsLoading(false);
        return;
      }

      // Call the verify-otp edge function
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          email: email.trim(),
          otp: otp.trim(),
        },
      });

      if (error) {
        console.error('❌ Verify OTP error:', error);
        showAlert('Verification Failed', error.message || 'Invalid or expired verification code');
        setIsLoading(false);
        return;
      }

      console.log('✅ OTP verified:', data);
      
      if (data.college) {
        setCollegeName(data.college.name);
      }

      setStep('terms');
    } catch (err: any) {
      console.error('❌ Verify OTP exception:', err);
      showAlert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTerms = () => {
    if (!termsAccepted) {
      showAlert('Terms Required', 'You must accept the Terms of Service and Privacy Policy to continue');
      return;
    }
    setStep('create-account');
  };

  const handleCreateAccount = async () => {
    try {
      // Validate username
      if (!username.trim()) {
        showAlert('Invalid Username', 'Please enter a username');
        return;
      }

      // Validate password
      if (password.length < 6) {
        showAlert('Invalid Password', 'Password must be at least 6 characters');
        return;
      }

      setIsLoading(true);
      console.log('👤 Creating account for:', email);

      // Call the create-account edge function
      const { data, error } = await supabase.functions.invoke('create-account', {
        body: { 
          email: email.trim(),
          username: username.trim(),
          password: password,
        },
      });

      if (error) {
        console.error('❌ Create account error:', error);
        showAlert('Account Creation Failed', error.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      console.log('✅ Account created:', data);

      const campus = await getCampusFromEmail(email);
      showAlert(
        'Account Created!',
        `Your ${campus?.name} account has been created successfully. You can now sign in.`
      );

      // Navigate to login
      router.replace('/login');
    } catch (err: any) {
      console.error('❌ Create account exception:', err);
      showAlert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image
            source={require('@/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>a college job marketplace</Text>
          
          {step === 'email' && (
            <>
              <Text style={styles.stepTitle}>Verify your .edu email</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>University Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@college.edu"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendVerificationEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => router.replace('/login')}
                disabled={isLoading}
              >
                <Text style={styles.switchButtonText}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={styles.stepTitle}>Enter verification code</Text>
              <Text style={styles.infoTextSmall}>
                We sent a 6-digit code to {email}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setStep('email')}
                disabled={isLoading}
              >
                <Text style={styles.switchButtonText}>
                  Change email address
                </Text>
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 For testing, you can use the code: 000000
                </Text>
              </View>
            </>
          )}

          {step === 'terms' && (
            <>
              <Text style={styles.stepTitle}>Terms & Conditions</Text>
              {collegeName && (
                <Text style={styles.infoTextSmall}>
                  {collegeName}
                </Text>
              )}
              
              <View style={styles.termsContainer}>
                <ScrollView style={styles.termsScroll} contentContainerStyle={styles.termsScrollContent}>
                  <Text style={styles.termsTitle}>Terms of Service</Text>
                  <Text style={styles.termsText}>
                    By using dormate, you agree to the following terms:
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>1. Eligibility</Text>
                  <Text style={styles.termsText}>
                    - You must be a currently enrolled student at a supported university{'\n'}
                    - You must be at least 18 years old{'\n'}
                    - You must use your official university email address
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>2. Campus Marketplaces</Text>
                  <Text style={styles.termsText}>
                    - Each university has a separate marketplace{'\n'}
                    - You can only view and accept jobs from your campus{'\n'}
                    - Jobs you post are only visible to your campus community
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>3. Payments</Text>
                  <Text style={styles.termsText}>
                    - All payments are processed through Stripe{'\n'}
                    - You must enable payouts before posting or accepting jobs{'\n'}
                    - Platform fees apply to all transactions{'\n'}
                    - You are responsible for paying agreed amounts
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>4. Conduct</Text>
                  <Text style={styles.termsText}>
                    - Be respectful and professional{'\n'}
                    - Provide accurate job descriptions{'\n'}
                    - Complete jobs as agreed{'\n'}
                    - Do not post illegal or fraudulent content{'\n'}
                    - Do not harass or abuse other users
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>5. Liability</Text>
                  <Text style={styles.termsText}>
                    - dormate is a platform connecting users{'\n'}
                    - We are not responsible for disputes between users{'\n'}
                    - We do not guarantee job quality or safety{'\n'}
                    - Use the service at your own risk
                  </Text>
                  
                  <Text style={styles.termsSubtitle}>6. Privacy</Text>
                  <Text style={styles.termsText}>
                    - We collect and use data as described in our Privacy Policy{'\n'}
                    - Your data is protected and not sold to third parties{'\n'}
                    - You can delete your account at any time
                  </Text>
                  
                  <Text style={styles.termsText}>
                    For complete terms, visit the Terms of Service page in Settings.
                  </Text>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  I accept the Terms of Service and Privacy Policy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, !termsAccepted && styles.buttonDisabled]}
                onPress={handleAcceptTerms}
                disabled={!termsAccepted}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setStep('verify')}
              >
                <Text style={styles.switchButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'create-account' && (
            <>
              <Text style={styles.stepTitle}>Create your account</Text>
              {collegeName && (
                <View style={styles.campusBadge}>
                  <Text style={styles.campusBadgeText}>🎓 {collegeName}</Text>
                </View>
              )}
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>University Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={email}
                  editable={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleCreateAccount}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => router.replace('/login')}
                disabled={isLoading}
              >
                <Text style={styles.switchButtonText}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Students from 80+ colleges can access their campus marketplace with their .edu email address.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 240,
    height: 110,
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  infoTextSmall: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 24,
  },
  campusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  campusBadgeText: {
    fontSize: 14,
    color: "#0369A1",
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
  },
  inputDisabled: {
    backgroundColor: "#E2E8F0",
    color: "#64748B",
  },
  termsContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    marginBottom: 20,
    maxHeight: 300,
  },
  termsScroll: {
    maxHeight: 300,
  },
  termsScrollContent: {
    padding: 16,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  termsSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2A5EEA",
    borderColor: "#2A5EEA",
  },
  checkmark: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
  },
  button: {
    backgroundColor: "#2A5EEA",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#2A5EEA",
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    fontSize: 13,
    color: "#0369A1",
    lineHeight: 18,
  },
});

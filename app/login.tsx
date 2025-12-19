
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import { isAllowedCampusEmail, getCampusFromEmail } from "@/constants/campus";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting sign in with email:', email);

      // Validate email is from an allowed campus
      const isAllowed = await isAllowedCampusEmail(email);
      if (!isAllowed) {
        showAlert('Invalid Email', 'This email domain is not from one of our supported schools. Please use your official college .edu email address.');
        setIsLoading(false);
        return;
      }

      const campus = await getCampusFromEmail(email);
      console.log('🎓 Campus detected:', campus?.name);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        showAlert('Sign In Failed', error.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Sign in successful');
      console.log('AUTH RESPONSE:', JSON.stringify({
        user: data.user?.email,
        session: data.session ? 'present' : 'missing',
        campus: campus?.name,
      }, null, 2));

      // Navigation will happen automatically via AuthContext
      router.replace('/');
    } catch (err: any) {
      console.error('❌ Sign in exception:', err);
      showAlert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {process.env.EXPO_PUBLIC_DORMATE_LOGO_URL ? (
          <Image
            source={{ uri: process.env.EXPO_PUBLIC_DORMATE_LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.title}>Dormate</Text>
        )}
        <Text style={styles.subtitle}>a college job marketplace</Text>
        <Text style={styles.signInText}>Sign in to continue</Text>

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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => router.push('/signup')}
          disabled={isLoading}
        >
          <Text style={styles.switchButtonText}>
            Don&apos;t have an account? Sign Up
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Students from 80+ colleges can access their campus marketplace with their .edu email address.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    width: 220,
    height: 100,
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
    marginBottom: 8,
    fontStyle: "italic",
  },
  signInText: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    marginBottom: 32,
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

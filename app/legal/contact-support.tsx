
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function ContactSupport() {
  const router = useRouter();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Error", "Please enter a subject");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    try {
      setSubmitting(true);
      console.log('📧 Submitting support request...');
      console.log('Subject:', subject);
      console.log('Message:', message);
      console.log('User:', user?.email);

      // In a production app, you would send this to your support system
      // For now, we'll just show a success message
      
      Alert.alert(
        "Support Request Sent",
        "Thank you for contacting us. We'll get back to you as soon as possible at " + user?.email,
        [
          {
            text: "OK",
            onPress: () => {
              setSubject("");
              setMessage("");
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error submitting support request:', error);
      Alert.alert("Error", "Failed to send support request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Contact Support</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📧 We're here to help! Send us a message and we'll get back to you as soon as possible.
          </Text>
        </View>

        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>Your Email:</Text>
            <Text style={styles.userInfoValue}>{user.email}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
              editable={!submitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please provide details about your issue or question..."
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!submitting}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Common Issues</Text>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>• Payment Issues</Text>
            <Text style={styles.helpItemText}>
              If you're having trouble with payments, make sure you've completed Stripe onboarding in Settings.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>• Account Access</Text>
            <Text style={styles.helpItemText}>
              Only @duke.edu and @unc.edu email addresses are supported.
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpItemTitle}>• Job Visibility</Text>
            <Text style={styles.helpItemText}>
              Jobs are only visible to users within your campus marketplace.
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
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: "#2A5EEA",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 15,
    color: "#0369A1",
    lineHeight: 22,
  },
  userInfo: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  userInfoValue: {
    fontSize: 16,
    color: "#0F172A",
  },
  form: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 150,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: "#2A5EEA",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  helpSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  helpItem: {
    marginBottom: 16,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  helpItemText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    paddingLeft: 16,
  },
});

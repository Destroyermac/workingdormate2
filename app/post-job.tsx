
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getCampusFromEmail } from "@/constants/campus";
import { useState, useEffect } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function PostJob() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthGuard();
  const { refreshUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pay, setPay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userCampus, setUserCampus] = useState<Awaited<ReturnType<typeof getCampusFromEmail>>>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get user's campus and payout status
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.email) {
        const campus = await getCampusFromEmail(user.email);
        setUserCampus(campus);
        setPayoutsEnabled(user.payoutsEnabled || false);
        console.log('🎓 User campus:', campus?.name);
        console.log('💳 Payouts enabled:', user.payoutsEnabled);
      }
    };
    loadUserData();
  }, [user]);

  const handleRefreshPayoutStatus = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Refreshing payout status...');
      
      // Refresh user data from the server
      await refreshUser();
      
      // Update local state
      if (user?.payoutsEnabled) {
        setPayoutsEnabled(true);
        Alert.alert('Success', 'Payouts are now enabled! You can post jobs.');
      } else {
        Alert.alert('Not Enabled', 'Payouts are not yet enabled. Please complete Stripe setup in Settings.');
      }
    } catch (error: any) {
      console.error('❌ Error refreshing payout status:', error);
      Alert.alert('Error', 'Failed to refresh payout status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Check if payouts are enabled
      if (!payoutsEnabled) {
        Alert.alert(
          "Payouts Required",
          "You must enable payouts before posting a job. This ensures you can pay workers when jobs are completed.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Enable Payouts", onPress: () => router.push("/(tabs)/settings") },
          ]
        );
        return;
      }

      // Validation
      if (!title.trim()) {
        Alert.alert("Error", "Please enter a job title");
        return;
      }
      if (!description.trim()) {
        Alert.alert("Error", "Please enter a job description");
        return;
      }
      if (!pay.trim() || isNaN(Number(pay)) || Number(pay) <= 0) {
        Alert.alert("Error", "Please enter a valid pay amount");
        return;
      }

      setSubmitting(true);
      console.log('📝 Submitting job...');
      console.log('📝 Title:', title);
      console.log('📝 Description:', description);
      console.log('📝 Pay:', pay);

      // Get user's college_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('college_id')
        .eq('id', user?.id)
        .single();

      if (userError || !userData) {
        console.error('❌ Error fetching user college:', userError);
        Alert.alert("Error", "Could not determine your campus. Please try again.");
        return;
      }

      console.log('🎓 User college_id:', userData.college_id);

      // Insert job
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          title: title.trim(),
          description: description.trim(),
          price_amount: Number(pay),
          price_currency: 'USD',
          status: 'open',
          college_id: userData.college_id,
          posted_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating job:', error);
        Alert.alert("Error", error.message);
        return;
      }

      console.log('✅ Job created:', data.id);
      
      // Clear form
      setTitle("");
      setDescription("");
      setPay("");
      
      // Show success message and navigate back
      Alert.alert(
        "Success", 
        "Job posted successfully!", 
        [
          {
            text: "OK",
            onPress: () => {
              console.log('✅ Navigating back to job board');
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('❌ Error in handleSubmit:', err);
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to post a job</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              console.log('⬅️ Navigating back');
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Post a Job</Text>
          <Text style={styles.subtitle}>Campus: {userCampus?.name || 'Loading...'}</Text>
        </View>

        {!payoutsEnabled && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Payouts Required</Text>
            <Text style={styles.warningText}>
              You must enable payouts before posting a job. This ensures you can pay workers when jobs are completed.
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={styles.warningButton}
                onPress={() => router.push("/(tabs)/settings")}
              >
                <Text style={styles.warningButtonText}>Enable Payouts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningButtonSecondary, refreshing && styles.buttonDisabled]}
                onPress={handleRefreshPayoutStatus}
                disabled={refreshing}
              >
                <Text style={styles.warningButtonSecondaryText}>
                  {refreshing ? 'Refreshing...' : 'Refresh Status'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Help move furniture"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the job in detail..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!submitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pay (USD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25"
              placeholderTextColor="#94A3B8"
              value={pay}
              onChangeText={setPay}
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Your job will be visible only to {userCampus?.name || 'your campus'} students
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, (submitting || !payoutsEnabled) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !payoutsEnabled}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Post Job</Text>
            )}
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    paddingTop: 48,
  },
  backButton: {
    marginBottom: 16,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  warningText: {
    fontSize: 15,
    color: "#92400E",
    lineHeight: 22,
    marginBottom: 12,
  },
  warningButtons: {
    flexDirection: "row",
    gap: 8,
  },
  warningButton: {
    flex: 1,
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  warningButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  warningButtonSecondary: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  warningButtonSecondaryText: {
    color: "#92400E",
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
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
    minHeight: 120,
    paddingTop: 12,
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#0369A1",
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
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 40,
  },
});

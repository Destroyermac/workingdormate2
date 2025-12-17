
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { DUKE_CAMPUS } from "@/constants/campus";
import { useEffect, useState } from "react";
import { supabase } from "@/app/integrations/supabase/client";

interface Job {
  id: string;
  title: string;
  description: string;
  price_amount: number;
  price_currency: string;
  status: string;
  posted_by_user_id: string;
  assigned_to_user_id: string | null;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { status, isLoading, isAuthenticated, isInvalidCampus, user } = useAuthGuard();
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserJobs();
    }
  }, [isAuthenticated, user]);

  const fetchUserJobs = async () => {
    try {
      setLoadingJobs(true);
      setError(null);
      console.log('📋 Fetching user jobs...');

      // Fetch posted jobs
      const { data: posted, error: postedError } = await supabase
        .from('jobs')
        .select('*')
        .eq('posted_by_user_id', user?.id)
        .order('created_at', { ascending: false });

      if (postedError) {
        console.error('❌ Error fetching posted jobs:', postedError);
        setError(postedError.message);
        return;
      }

      console.log('✅ Posted jobs fetched:', posted?.length || 0);
      setPostedJobs(posted || []);

      // Fetch accepted jobs
      const { data: accepted, error: acceptedError } = await supabase
        .from('jobs')
        .select('*')
        .eq('assigned_to_user_id', user?.id)
        .order('created_at', { ascending: false });

      if (acceptedError) {
        console.error('❌ Error fetching accepted jobs:', acceptedError);
        setError(acceptedError.message);
        return;
      }

      console.log('✅ Accepted jobs fetched:', accepted?.length || 0);
      setAcceptedJobs(accepted || []);
    } catch (err: any) {
      console.error('❌ Error in fetchUserJobs:', err);
      setError(err.message);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (err: any) {
      console.error('❌ Error signing out:', err);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2A5EEA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // Show campus error if wrong domain
  if (isInvalidCampus) {
    return (
      <View style={styles.container}>
        <View style={styles.blockingScreen}>
          <Text style={styles.blockingTitle}>❌ Access Denied</Text>
          <Text style={styles.blockingText}>Only Duke students are allowed</Text>
          <Text style={styles.blockingSubtext}>
            Your email: {user?.email}
          </Text>
          <Text style={styles.blockingSubtext}>
            Required: @{DUKE_CAMPUS.domain}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👤 My Profile</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Username:</Text>
            <Text style={styles.profileValue}>{user?.username}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Email:</Text>
            <Text style={styles.profileValue}>{user?.email}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Campus:</Text>
            <Text style={styles.profileValue}>{DUKE_CAMPUS.name}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Payouts:</Text>
            <Text style={[styles.profileValue, user?.payoutsEnabled ? styles.enabled : styles.disabled]}>
              {user?.payoutsEnabled ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        </View>

        {/* Posted Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Posted Jobs ({postedJobs.length})</Text>
          {loadingJobs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2A5EEA" />
            </View>
          ) : error ? (
            <Text style={styles.errorText}>Error: {error}</Text>
          ) : postedJobs.length === 0 ? (
            <Text style={styles.emptyText}>No posted jobs yet</Text>
          ) : (
            postedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/job/${job.id}`)}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={[styles.statusPill, getStatusColor(job.status)]}>
                    <Text style={styles.statusPillText}>{job.status}</Text>
                  </View>
                </View>
                <Text style={styles.jobPay}>
                  ${job.price_amount} {job.price_currency}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Accepted Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Accepted Jobs ({acceptedJobs.length})</Text>
          {loadingJobs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2A5EEA" />
            </View>
          ) : error ? (
            <Text style={styles.errorText}>Error: {error}</Text>
          ) : acceptedJobs.length === 0 ? (
            <Text style={styles.emptyText}>No accepted jobs yet</Text>
          ) : (
            acceptedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/job/${job.id}`)}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={[styles.statusPill, getStatusColor(job.status)]}>
                    <Text style={styles.statusPillText}>{job.status}</Text>
                  </View>
                </View>
                <Text style={styles.jobPay}>
                  ${job.price_amount} {job.price_currency}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Jobs</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'open':
      return { backgroundColor: '#10B981' };
    case 'in_progress':
      return { backgroundColor: '#F59E0B' };
    case 'completed':
      return { backgroundColor: '#6366F1' };
    case 'cancelled':
      return { backgroundColor: '#EF4444' };
    default:
      return { backgroundColor: '#64748B' };
  }
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  signOutButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  profileValue: {
    fontSize: 16,
    color: "#0F172A",
  },
  enabled: {
    color: "#10B981",
  },
  disabled: {
    color: "#EF4444",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  jobPay: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A5EEA",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    padding: 20,
  },
  backButton: {
    backgroundColor: "#64748B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  blockingScreen: {
    backgroundColor: "white",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blockingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  blockingText: {
    fontSize: 18,
    color: "#475569",
    marginBottom: 8,
    textAlign: "center",
  },
  blockingSubtext: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2A5EEA",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

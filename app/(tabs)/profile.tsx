
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getCampusFromEmail } from "@/constants/campus";
import { useEffect, useState, useCallback } from "react";
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
  college_id: string;
  created_at: string;
}

export default function Profile() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthGuard();
  const [userCampus, setUserCampus] = useState<Awaited<ReturnType<typeof getCampusFromEmail>>>(null);
  const [userCollegeId, setUserCollegeId] = useState<string | null>(null);
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's campus and college_id
  useEffect(() => {
    const loadCampus = async () => {
      if (user?.email) {
        const campus = await getCampusFromEmail(user.email);
        setUserCampus(campus);
        console.log('🎓 User campus:', campus?.name);
        
        // Get user's college_id from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('college_id')
          .eq('id', user.id)
          .single();
        
        if (userData && !userError) {
          setUserCollegeId(userData.college_id);
          console.log('🎓 User college_id:', userData.college_id);
        }
      }
    };
    loadCampus();
  }, [user]);

  // Fetch jobs when authenticated
  useEffect(() => {
    if (isAuthenticated && user && userCollegeId) {
      fetchJobs();
    }
  }, [isAuthenticated, user, userCollegeId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
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

      console.log('✅ Posted jobs fetched:', posted?.length || 0);
      console.log('✅ Accepted jobs fetched:', accepted?.length || 0);

      // DEFENSIVE UI FILTERING: Ensure all jobs are from the same college
      const filteredPosted = (posted || []).filter(job => {
        const isCorrectCollege = job.college_id === userCollegeId;
        if (!isCorrectCollege) {
          console.error('⚠️ SECURITY WARNING: Posted job from different college!', {
            jobId: job.id,
            jobCollegeId: job.college_id,
            userCollegeId: userCollegeId,
          });
        }
        return isCorrectCollege;
      });

      const filteredAccepted = (accepted || []).filter(job => {
        const isCorrectCollege = job.college_id === userCollegeId;
        if (!isCorrectCollege) {
          console.error('⚠️ SECURITY WARNING: Accepted job from different college!', {
            jobId: job.id,
            jobCollegeId: job.college_id,
            userCollegeId: userCollegeId,
          });
        }
        return isCorrectCollege;
      });

      console.log('✅ Posted jobs after filtering:', filteredPosted.length);
      console.log('✅ Accepted jobs after filtering:', filteredAccepted.length);

      setPostedJobs(filteredPosted);
      setAcceptedJobs(filteredAccepted);
    } catch (err: any) {
      console.error('❌ Error in fetchJobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [fetchJobs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#10B981';
      case 'in_progress':
        return '#F59E0B';
      case 'completed':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to view your profile</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2A5EEA"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👤 Profile</Text>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.campusBadge}>
              <Text style={styles.campusBadgeText}>🎓 {userCampus?.name || 'Loading...'}</Text>
            </View>
          </View>
        </View>

        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2A5EEA" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Posted Jobs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posted Jobs ({postedJobs.length})</Text>
              {postedJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyText}>No posted jobs yet</Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => router.push('/post-job')}
                  >
                    <Text style={styles.emptyButtonText}>Post a Job</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                postedJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => router.push(`/job/${job.id}`)}
                  >
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(job.status) }]}>
                        <Text style={styles.statusPillText}>{job.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>
                    <Text style={styles.jobPay}>
                      ${job.price_amount} {job.price_currency}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Accepted Jobs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accepted Jobs ({acceptedJobs.length})</Text>
              {acceptedJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>💼</Text>
                  <Text style={styles.emptyText}>No accepted jobs yet</Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Text style={styles.emptyButtonText}>Browse Jobs</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                acceptedJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => router.push(`/job/${job.id}`)}
                  >
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(job.status) }]}>
                        <Text style={styles.statusPillText}>{job.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>
                    <Text style={styles.jobPay}>
                      ${job.price_amount} {job.price_currency}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 16,
  },
  userInfo: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 12,
  },
  campusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  campusBadgeText: {
    fontSize: 14,
    color: "#0369A1",
    fontWeight: "600",
  },
  settingsButton: {
    backgroundColor: "#2A5EEA",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
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
  jobDescription: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 20,
  },
  jobPay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2A5EEA",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2A5EEA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: "#2A5EEA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#2A5EEA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

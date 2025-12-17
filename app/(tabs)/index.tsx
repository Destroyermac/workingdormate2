
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getCampusFromEmail } from "@/constants/campus";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import React from "react";

interface Job {
  id: string;
  title: string;
  description: string;
  price_amount: number;
  price_currency: string;
  status: string;
  posted_by_user_id: string;
  college_id: string;
  created_at: string;
  users?: {
    username: string;
    email: string;
    college_id: string;
  };
}

export default function JobBoard() {
  const router = useRouter();
  const { status, isLoading, isAuthenticated, isInvalidCampus, user } = useAuthGuard();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCampus, setUserCampus] = useState<Awaited<ReturnType<typeof getCampusFromEmail>>>(null);
  const [userCollegeId, setUserCollegeId] = useState<string | null>(null);

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
      
      // Set up real-time subscription for job updates
      const channel = supabase
        .channel('jobs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
          },
          (payload) => {
            console.log('🔄 Job change detected:', payload.eventType);
            fetchJobs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, user, userCollegeId]);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      setError(null);
      console.log('📋 Fetching open jobs for user campus...');
      console.log('📋 User college_id:', userCollegeId);

      // Get blocked users list first (Apple compliance - respect blocks)
      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('blocked_user_id, blocker_user_id')
        .or(`blocker_user_id.eq.${user?.id},blocked_user_id.eq.${user?.id}`);

      const blockedUserIds = new Set<string>();
      if (blockedData) {
        blockedData.forEach(block => {
          // Add both blocker and blocked (mutual blocking)
          if (block.blocker_user_id === user?.id) {
            blockedUserIds.add(block.blocked_user_id);
          } else {
            blockedUserIds.add(block.blocker_user_id);
          }
        });
      }
      console.log('🚫 Blocked users:', blockedUserIds.size);

      // RLS policies will automatically filter jobs by college_id
      // But we also add explicit filtering as a defensive measure
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          price_amount,
          price_currency,
          status,
          posted_by_user_id,
          college_id,
          created_at,
          users:posted_by_user_id (
            username,
            email,
            college_id
          )
        `)
        .eq('status', 'open')
        .eq('college_id', userCollegeId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching jobs:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('✅ Jobs fetched from database:', data?.length || 0);

      // DEFENSIVE UI FILTERING: Double-check that all jobs are from the same college
      // AND filter out jobs from blocked users (Apple compliance)
      const filteredJobs = (data || []).filter(job => {
        const isCorrectCollege = job.college_id === userCollegeId;
        if (!isCorrectCollege) {
          console.error('⚠️ SECURITY WARNING: Job from different college leaked through RLS!', {
            jobId: job.id,
            jobCollegeId: job.college_id,
            userCollegeId: userCollegeId,
          });
        }
        
        // Filter out jobs from blocked users (Apple compliance)
        const isBlocked = blockedUserIds.has(job.posted_by_user_id);
        if (isBlocked) {
          console.log('🚫 Filtering out job from blocked user:', job.id);
        }
        
        return isCorrectCollege && !isBlocked;
      });

      if (filteredJobs.length !== data?.length) {
        console.log('⚠️ Filtered out', (data?.length || 0) - filteredJobs.length, 'jobs (college mismatch or blocked users)');
      }

      console.log('✅ Jobs after defensive filtering:', filteredJobs.length);
      setJobs(filteredJobs);
    } catch (err: any) {
      console.error('❌ Error in fetchJobs:', err);
      setError(err.message);
    } finally {
      setLoadingJobs(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [fetchJobs]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2A5EEA" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.blockingScreen}>
            <Text style={styles.blockingTitle}>🏠 dormate</Text>
            <Text style={styles.blockingSubtitle}>a college job marketplace</Text>
            <Text style={styles.blockingText}>Please sign in with your university email</Text>
            <Text style={styles.blockingSubtext}>@college.edu</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                console.log('🔐 Navigate to login');
                router.push('/login');
              }}
            >
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show campus error if wrong domain
  if (isInvalidCampus) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.blockingScreen}>
            <Text style={styles.blockingTitle}>❌ Access Denied</Text>
            <Text style={styles.blockingText}>Only students from supported colleges are allowed</Text>
            <Text style={styles.blockingSubtext}>
              Your email: {user?.email}
            </Text>
            <Text style={styles.blockingSubtext}>
              Required: Official college .edu email
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={async () => {
                console.log('🚪 Signing out...');
                await supabase.auth.signOut();
                router.replace('/login');
              }}
            >
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show job board for authenticated users
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
          <Text style={styles.title}>🎓 {userCampus?.name || 'Campus'}</Text>
          <Text style={styles.subtitle}>Job Marketplace</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ {user?.email}</Text>
          </View>
        </View>

        {/* Post Job Button */}
        <TouchableOpacity 
          style={styles.postButton}
          onPress={() => {
            console.log('➕ Navigate to post job');
            router.push('/post-job');
          }}
        >
          <Text style={styles.postButtonText}>+ Post a Job</Text>
        </TouchableOpacity>

        {/* Jobs List */}
        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>Open Jobs</Text>
          
          {loadingJobs && !refreshing ? (
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
          ) : jobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No open jobs yet</Text>
              <Text style={styles.emptySubtext}>Be the first to post a job!</Text>
            </View>
          ) : (
            <React.Fragment>
              {jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    console.log('👆 Navigate to job detail:', job.id);
                    router.push(`/job/${job.id}`);
                  }}
                >
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{job.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description}
                  </Text>
                  <View style={styles.jobFooter}>
                    <Text style={styles.jobPay}>
                      ${job.price_amount} {job.price_currency}
                    </Text>
                    <Text style={styles.jobPoster}>
                      by {job.users?.username || 'Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </React.Fragment>
          )}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#475569",
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    color: "#0369A1",
    fontWeight: "500",
  },
  postButton: {
    backgroundColor: "#2A5EEA",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  postButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  jobsSection: {
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
    alignItems: "flex-start",
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
    backgroundColor: "#10B981",
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
    marginBottom: 12,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobPay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2A5EEA",
  },
  jobPoster: {
    fontSize: 14,
    color: "#64748B",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
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
    maxWidth: 400,
    width: "100%",
  },
  blockingTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  blockingSubtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
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

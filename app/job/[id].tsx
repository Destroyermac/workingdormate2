
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import { supabaseApi } from "@/services/supabaseApi";
import { stripeService } from '@/services/stripeService';
import Toast from 'react-native-toast-message';
import React from "react";
import { ReportModal } from "@/components/ReportModal";
import { BlockUserModal } from "@/components/BlockUserModal";

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
  users?: {
    username: string;
    email: string;
  };
  assigned_user?: {
    username: string;
    email: string;
  };
}

interface Comment {
  id: string;
  job_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  users?: {
    username: string;
    email: string;
  };
}

export default function JobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAuthenticated, user } = useAuthGuard();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [resigning, setResigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  
  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Report and Block modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    if (user) {
      setPayoutsEnabled(user.payoutsEnabled || false);
      console.log('💳 Payouts enabled:', user.payoutsEnabled);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchJob();
      fetchComments();
      
      // Subscribe to real-time comment updates
      const channel = supabase
        .channel(`job-comments-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_comments',
            filter: `job_id=eq.${id}`,
          },
          (payload) => {
            console.log('💬 Comment change detected:', payload);
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📋 Fetching job:', id);

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
          assigned_to_user_id,
          created_at,
          users:posted_by_user_id (
            username,
            email
          ),
          assigned_user:assigned_to_user_id (
            username,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching job:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Apple compliance: Check if job poster is blocked
      if (user && data.posted_by_user_id !== user.id) {
        const isBlocked = await supabaseApi.isUserBlocked(data.posted_by_user_id);
        if (isBlocked) {
          console.log('🚫 Job poster is blocked, redirecting...');
          setError('This job is not available');
          Toast.show({
            type: 'info',
            text1: 'Job not available',
            text2: 'You have blocked this user',
          });
          setTimeout(() => router.back(), 2000);
          return;
        }
      }

      console.log('✅ Job fetched:', data);
      setJob(data);
    } catch (err: any) {
      console.error('❌ Error in fetchJob:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      console.log('💬 Fetching comments for job:', id);

      const { data, error: fetchError } = await supabase
        .from('job_comments')
        .select(`
          id,
          job_id,
          user_id,
          comment,
          created_at,
          users:user_id (
            username,
            email
          )
        `)
        .eq('job_id', id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching comments:', fetchError);
        return;
      }

      console.log('✅ Comments fetched:', data?.length || 0);
      setComments(data || []);
    } catch (err: any) {
      console.error('❌ Error in fetchComments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !job || !user) return;

    try {
      setSendingComment(true);
      console.log('💬 Sending comment...');

      const { error: insertError } = await supabase
        .from('job_comments')
        .insert({
          job_id: job.id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (insertError) {
        console.error('❌ Error sending comment:', insertError);
        Toast.show({
          type: 'error',
          text1: 'Failed to send comment',
          text2: insertError.message,
        });
        return;
      }

      console.log('✅ Comment sent successfully');
      setNewComment("");
    } catch (err: any) {
      console.error('❌ Error in handleSendComment:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to send comment',
        text2: err.message,
      });
    } finally {
      setSendingComment(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!job || !user) return;

    // Check if payouts are enabled
    if (!payoutsEnabled) {
      Alert.alert(
        "Payouts Required",
        "You must enable payouts before accepting a job. This ensures you can receive payment when the job is completed.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enable Payouts", onPress: () => router.push("/(tabs)/settings") },
        ]
      );
      return;
    }

    Alert.alert(
      "Accept Job",
      `Are you sure you want to accept this job for $${job.price_amount}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setAccepting(true);
              console.log('✅ Accepting job:', job.id);

              // 1. Update job status and assign to user
              const { error: updateError } = await supabase
                .from('jobs')
                .update({
                  status: 'in_progress',
                  assigned_to_user_id: user.id,
                })
                .eq('id', job.id)
                .eq('status', 'open');

              if (updateError) {
                console.error('❌ Error updating job:', updateError);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to accept job',
                  text2: updateError.message,
                });
                return;
              }

              // 2. Create job_acceptance record
              const { error: acceptError } = await supabase
                .from('job_acceptances')
                .insert({
                  job_id: job.id,
                  accepted_by: user.id,
                });

              if (acceptError) {
                console.error('❌ Error creating job acceptance:', acceptError);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to accept job',
                  text2: acceptError.message,
                });
                return;
              }

              console.log('✅ Job accepted successfully');
              Toast.show({
                type: 'success',
                text1: 'Job accepted!',
                text2: 'You can now see it in your profile.',
              });
              
              fetchJob();
            } catch (err: any) {
              console.error('❌ Error in handleAcceptJob:', err);
              Toast.show({
                type: 'error',
                text1: 'Failed to accept job',
                text2: err.message,
              });
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleResignJob = async () => {
    if (!job || !user) return;

    Alert.alert(
      "Resign from Job",
      "Are you sure you want to resign from this job? This will permanently delete the job for both you and the poster.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Resign",
          style: "destructive",
          onPress: async () => {
            try {
              setResigning(true);
              console.log('🚫 Resigning from job:', job.id);

              // Delete the job completely
              // This will cascade delete job_acceptances and job_comments due to foreign key constraints
              const { error: deleteError } = await supabase
                .from('jobs')
                .delete()
                .eq('id', job.id)
                .eq('assigned_to_user_id', user.id);

              if (deleteError) {
                console.error('❌ Error deleting job:', deleteError);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to resign',
                  text2: deleteError.message,
                });
                return;
              }

              console.log('✅ Job deleted successfully');
              Toast.show({
                type: 'success',
                text1: 'Resigned successfully',
                text2: 'The job has been deleted.',
              });
              
              router.back();
            } catch (err: any) {
              console.error('❌ Error in handleResignJob:', err);
              Toast.show({
                type: 'error',
                text1: 'Failed to resign',
                text2: err.message,
              });
            } finally {
              setResigning(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = async () => {
    if (!job || !user) return;

    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              console.log('🗑️ Deleting job:', job.id);

              // Delete the job completely
              // This will cascade delete job_acceptances and job_comments due to foreign key constraints
              const { error: deleteError } = await supabase
                .from('jobs')
                .delete()
                .eq('id', job.id)
                .eq('posted_by_user_id', user.id);

              if (deleteError) {
                console.error('❌ Error deleting job:', deleteError);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to delete job',
                  text2: deleteError.message,
                });
                return;
              }

              console.log('✅ Job deleted successfully');
              Toast.show({
                type: 'success',
                text1: 'Job deleted',
                text2: 'The job has been deleted successfully.',
              });
              
              router.back();
            } catch (err: any) {
              console.error('❌ Error in handleDeleteJob:', err);
              Toast.show({
                type: 'error',
                text1: 'Failed to delete job',
                text2: err.message,
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handlePayJob = async () => {
    if (!job || !user) return;

    // No platform check here - stripeService handles it gracefully
    Alert.alert(
      "Process Payment",
      `Are you sure you want to pay $${job.price_amount} ${job.price_currency} for this job?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pay",
          onPress: async () => {
            try {
              setPaying(true);
              console.log('💳 Processing payment for job:', job.id);

              // Step 1: Create PaymentIntent
              const paymentResult = await supabaseApi.createPayment(job.id);
              
              // Validate paymentResult exists and has required fields
              if (!paymentResult?.clientSecret || !paymentResult?.paymentIntentId) {
                throw new Error('Payment details missing from result');
              }

              console.log('✅ Payment intent created:', paymentResult.paymentIntentId);

              // Step 2: Initialize Payment Sheet with required options
              // stripeService will gracefully handle Expo Go / web environments
              const { error: initError } = await stripeService.initPaymentSheet({
                merchantDisplayName: 'Campus Jobs',
                paymentIntentClientSecret: paymentResult.clientSecret,
                allowsDelayedPaymentMethods: true,
                returnURL: 'natively://stripe-redirect',
              });

              if (initError) {
                console.error('❌ Error initializing payment sheet:', initError);
                // Show user-friendly message for Expo Go / web
                Toast.show({
                  type: 'error',
                  text1: 'Payment unavailable',
                  text2: initError.message,
                  visibilityTime: 5000,
                });
                return;
              }

              console.log('✅ Payment sheet initialized');

              // Step 3: Present Payment Sheet
              // stripeService will gracefully handle Expo Go / web environments
              const { error: paymentError } = await stripeService.presentPaymentSheet();

              if (paymentError) {
                console.error('❌ Payment error:', paymentError);
                const message = paymentError.message || 'Payment failed';
                Toast.show({
                  type: 'error',
                  text1: 'Payment failed',
                  text2: message,
                  visibilityTime: 5000,
                });
                return;
              }

              console.log('✅ Payment successful');

              // Step 4: Record payment receipt AFTER successful payment
              try {
                await supabaseApi.recordPaymentReceipt(job.id, paymentResult.paymentIntentId);
                console.log('✅ Payment receipt recorded');
              } catch (receiptError) {
                console.error('⚠️ Failed to record receipt:', receiptError);
                // Don't fail the whole flow
              }

              // Step 5: Mark job 'completed' ONLY AFTER presentPaymentSheet() returns without error
              const { error: updateError } = await supabase
                .from('jobs')
                .update({
                  status: 'completed',
                })
                .eq('id', job.id);

              if (updateError) {
                console.error('❌ Error updating job status:', updateError);
              }

              Toast.show({
                type: 'success',
                text1: 'Payment successful!',
                text2: `$${(paymentResult.workerAmount / 100).toFixed(2)} will be transferred to the worker.`,
              });

              fetchJob();
            } catch (err: any) {
              console.error('❌ Error in handlePayJob:', err);
              // Extract error message from various possible error formats
              const message = err.data?.error || err.message || 'Failed to process payment. Please try again.';
              Toast.show({
                type: 'error',
                text1: 'Payment failed',
                text2: message,
                visibilityTime: 5000,
              });
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to view jobs</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2A5EEA" />
          <Text style={styles.loadingText}>Loading job...</Text>
        </View>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Error: {error || 'Job not found'}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isJobPoster = job.posted_by_user_id === user?.id;
  const isAssignedWorker = job.assigned_to_user_id === user?.id;
  const canAccept = !isJobPoster && job.status === 'open' && payoutsEnabled;
  const canResign = isAssignedWorker && (job.status === 'in_progress');
  const canPay = isJobPoster && job.status === 'in_progress' && job.assigned_to_user_id;
  const canDelete = isJobPoster;
  const canComment = (isJobPoster || isAssignedWorker) && job.assigned_to_user_id;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={[
              styles.statusPill,
              job.status === 'open' && styles.statusOpen,
              job.status === 'in_progress' && styles.statusInProgress,
              job.status === 'completed' && styles.statusCompleted,
              job.status === 'cancelled' && styles.statusCancelled,
            ]}>
              <Text style={styles.statusPillText}>{job.status}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay</Text>
            <Text style={styles.pay}>
              ${job.price_amount} {job.price_currency}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted By</Text>
            <Text style={styles.poster}>
              {job.users?.username || 'Unknown'}
            </Text>
            <Text style={styles.posterEmail}>
              {job.users?.email || ''}
            </Text>
          </View>

          {job.assigned_to_user_id && job.assigned_user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned To</Text>
              <Text style={styles.poster}>
                {job.assigned_user.username}
              </Text>
              <Text style={styles.posterEmail}>
                {job.assigned_user.email}
              </Text>
            </View>
          )}

          {/* Report and Block Actions - Apple Compliance */}
          {!isJobPoster && job.users && (
            <View style={styles.safetyActions}>
              <TouchableOpacity
                style={styles.safetyButton}
                onPress={() => setShowReportModal(true)}
              >
                <Text style={styles.safetyButtonText}>🚨 Report Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.safetyButton}
                onPress={() => setShowBlockModal(true)}
              >
                <Text style={styles.safetyButtonText}>🚫 Block User</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted</Text>
            <Text style={styles.date}>
              {new Date(job.created_at).toLocaleDateString()} at{' '}
              {new Date(job.created_at).toLocaleTimeString()}
            </Text>
          </View>

          {isJobPoster && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ You posted this job
              </Text>
            </View>
          )}

          {isAssignedWorker && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ You are assigned to this job
              </Text>
            </View>
          )}

          {!isJobPoster && job.status === 'open' && !payoutsEnabled && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ You must enable payouts before accepting jobs. Go to Settings to enable payouts.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!isJobPoster && job.status === 'open' && (
              <TouchableOpacity 
                style={[styles.acceptButton, (accepting || !payoutsEnabled) && styles.buttonDisabled]}
                onPress={handleAcceptJob}
                disabled={accepting || !payoutsEnabled}
              >
                {accepting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.acceptButtonText}>
                    {payoutsEnabled ? 'Accept Job' : 'Enable Payouts to Accept'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {canResign && (
              <TouchableOpacity 
                style={[styles.resignButton, resigning && styles.buttonDisabled]}
                onPress={handleResignJob}
                disabled={resigning}
              >
                {resigning ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.resignButtonText}>Resign from Job</Text>
                )}
              </TouchableOpacity>
            )}

            {canPay && (
              <TouchableOpacity 
                style={[styles.payButton, paying && styles.buttonDisabled]}
                onPress={handlePayJob}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.payButtonText}>💳 Pay ${job.price_amount}</Text>
                )}
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity 
                style={[styles.deleteButton, deleting && styles.buttonDisabled]}
                onPress={handleDeleteJob}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.deleteButtonText}>🗑️ Delete Job</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {job.status !== 'open' && !isJobPoster && !isAssignedWorker && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ This job is no longer available
              </Text>
            </View>
          )}
        </View>

        {/* Comments Section */}
        {canComment && (
          <View style={styles.commentsCard}>
            <Text style={styles.commentsTitle}>💬 Comments</Text>
            <Text style={styles.commentsSubtitle}>
              Communicate with {isJobPoster ? 'the worker' : 'the job poster'} about this job
            </Text>

            {/* Comments List */}
            <View style={styles.commentsList}>
              {loadingComments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2A5EEA" />
                </View>
              ) : comments.length === 0 ? (
                <Text style={styles.noCommentsText}>No comments yet. Start the conversation!</Text>
              ) : (
                <React.Fragment>
                  {comments.map((comment) => {
                    const isOwnComment = comment.user_id === user?.id;
                    return (
                      <View 
                        key={comment.id} 
                        style={[
                          styles.commentBubble,
                          isOwnComment ? styles.commentBubbleOwn : styles.commentBubbleOther
                        ]}
                      >
                        <Text style={[
                          styles.commentUsername,
                          isOwnComment && styles.commentUsernameOwn
                        ]}>
                          {comment.users?.username || 'Unknown'}
                        </Text>
                        <Text style={[
                          styles.commentText,
                          isOwnComment && styles.commentTextOwn
                        ]}>
                          {comment.comment}
                        </Text>
                        <Text style={[
                          styles.commentTime,
                          isOwnComment && styles.commentTimeOwn
                        ]}>
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </React.Fragment>
              )}
            </View>

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Type your message..."
                placeholderTextColor="#94A3B8"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                editable={!sendingComment}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || sendingComment) && styles.sendButtonDisabled
                ]}
                onPress={handleSendComment}
                disabled={!newComment.trim() || sendingComment}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedJobId={job?.id}
        reportType="job"
      />

      {/* Block User Modal - Apple Compliance */}
      {job?.users && (
        <BlockUserModal
          visible={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          userId={job.posted_by_user_id}
          username={job.users.username}
          onBlockSuccess={() => {
            // Navigate back after blocking
            Toast.show({
              type: 'success',
              text1: 'User blocked',
              text2: 'You will no longer see their content',
            });
            router.back();
          }}
        />
      )}
    </KeyboardAvoidingView>
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
    width: "100%",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 16,
    paddingTop: 48,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#2A5EEA",
    fontWeight: "600",
  },
  jobCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: "#10B981",
  },
  statusInProgress: {
    backgroundColor: "#F59E0B",
  },
  statusCompleted: {
    backgroundColor: "#6366F1",
  },
  statusCancelled: {
    backgroundColor: "#EF4444",
  },
  statusPillText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 16,
    color: "#0F172A",
    lineHeight: 24,
  },
  pay: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2A5EEA",
  },
  poster: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  posterEmail: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: "#64748B",
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#0369A1",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: "#92400E",
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  resignButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resignButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  payButton: {
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
  payButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
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
  commentsCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  commentsSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  commentsList: {
    marginBottom: 16,
    maxHeight: 400,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  noCommentsText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  commentBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: "80%",
  },
  commentBubbleOwn: {
    backgroundColor: "#2A5EEA",
    alignSelf: "flex-end",
  },
  commentBubbleOther: {
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    color: "#64748B",
  },
  commentUsernameOwn: {
    color: "#E0F2FE",
  },
  commentText: {
    fontSize: 15,
    color: "#0F172A",
    lineHeight: 20,
  },
  commentTextOwn: {
    color: "white",
  },
  commentTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  commentTimeOwn: {
    color: "#BFDBFE",
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#2A5EEA",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  safetyActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  safetyButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  safetyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reportContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  reportClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  reportCloseText: {
    fontSize: 18,
    color: "#475569",
    fontWeight: "600",
  },
});

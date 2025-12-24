
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator, Switch, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getCampusFromEmail } from "@/constants/campus";
import { useEffect, useState } from "react";
import { supabase } from "@/app/integrations/supabase/client";
import { stripeService } from "@/services/stripeService";
import { useAuth } from "@/contexts/AuthContext";
import * as WebBrowser from 'expo-web-browser';
import { supabaseApi } from "@/services/supabaseApi";
import Toast from 'react-native-toast-message';
import { notificationService } from "@/services/notificationService";

export default function Settings() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthGuard();
  const { refreshUser } = useAuth();
  const [userCampus, setUserCampus] = useState<Awaited<ReturnType<typeof getCampusFromEmail>>>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [checkingPayouts, setCheckingPayouts] = useState(false);
  const [settingUpPayouts, setSettingUpPayouts] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const loadCampus = async () => {
      if (user?.email) {
        const campus = await getCampusFromEmail(user.email);
        setUserCampus(campus);
        setPayoutsEnabled(user.payoutsEnabled || false);
        console.log('🎓 User campus:', campus?.name);
        console.log('💳 Payouts enabled:', user.payoutsEnabled);
      }
    };
    loadCampus();
    loadBlockedUsers();
    loadNotificationPref();
  }, [user]);

  const loadNotificationPref = async () => {
    try {
      setLoadingNotifications(true);
      const enabled = await notificationService.hasEnabledNotifications();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('❌ Error loading notification preference:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      console.log('🚫 Loading blocked users...');
      const data = await supabaseApi.getBlockedUsers();
      setBlockedUsers(data || []);
      console.log('✅ Blocked users loaded:', data?.length || 0);
    } catch (error: any) {
      console.error('❌ Error loading blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              console.log('🔓 Unblocking user:', userId);
              await supabaseApi.unblockUser(userId);
              Toast.show({
                type: 'success',
                text1: 'User unblocked',
                text2: `You can now see content from ${username}`,
              });
              loadBlockedUsers();
            } catch (error: any) {
              console.error('❌ Error unblocking user:', error);
              Toast.show({
                type: 'error',
                text1: 'Failed to unblock user',
                text2: error.message,
              });
            }
          },
        },
      ]
    );
  };

  const handleSetupPayouts = async () => {
    try {
      setSettingUpPayouts(true);
      console.log('💳 Setting up Stripe payouts...');

      const result = await stripeService.setupPayouts();

      if (result.needsOnboarding && result.onboardingUrl) {
        console.log('🔗 Opening Stripe onboarding URL:', result.onboardingUrl);
        
        // Open Stripe onboarding in browser
        const browserResult = await WebBrowser.openBrowserAsync(result.onboardingUrl);
        
        if (browserResult.type === 'opened' || browserResult.type === 'cancel') {
          Alert.alert(
            'Complete Stripe Setup',
            'Please complete the Stripe setup in your browser, then return here and tap "Refresh Payout Status" to verify.',
            [{ text: 'OK' }]
          );
        }
      } else if (result.payoutsEnabled) {
        Alert.alert('Success', 'Payouts are already enabled for your account!');
        setPayoutsEnabled(true);
        // Refresh user data
        await refreshUser();
      }
    } catch (error: any) {
      console.error('❌ Error setting up payouts:', error);
      Alert.alert('Error', error.message || 'Failed to setup payouts. Please try again.');
    } finally {
      setSettingUpPayouts(false);
    }
  };

  const handleCheckPayoutStatus = async () => {
    try {
      setCheckingPayouts(true);
      console.log('🔍 Checking payout status...');

      const result = await stripeService.checkPayoutStatus();
      console.log('💳 Payout status:', result);

      setPayoutsEnabled(result.payoutsEnabled);

      // Refresh user data to update the context
      await refreshUser();

      if (result.payoutsEnabled) {
        Alert.alert('Success', 'Payouts are enabled! You can now post and accept jobs.');
      } else if (result.hasAccount && !result.detailsSubmitted) {
        Alert.alert(
          'Setup Incomplete',
          'Your Stripe account exists but setup is not complete. Please complete the onboarding process.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Complete Setup', onPress: handleSetupPayouts },
          ]
        );
      } else {
        Alert.alert(
          'Payouts Not Enabled',
          'You need to complete Stripe setup to enable payouts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Setup Now', onPress: handleSetupPayouts },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error checking payout status:', error);
      Alert.alert('Error', error.message || 'Failed to check payout status. Please try again.');
    } finally {
      setCheckingPayouts(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteError('');
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const invokeDeleteCascade = async (userId: string, jwt?: string) => {
    const attempt = async () => {
      const call = supabase.functions.invoke('delete-user-cascade', {
        body: { user_id: userId },
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      });

      const timed = Promise.race([
        call,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 20000)),
      ]) as Promise<{ data: any; error: any }>;

      return timed;
    };

    try {
      return await attempt();
    } catch (err) {
      console.warn('⚠️ Delete attempt failed, retrying...', err);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return attempt();
    }
  };

  const performDeleteAccount = async () => {
    if (!user?.id) {
      setDeleteError('You must be signed in to delete your account.');
      return;
    }
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteError('');

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Your session expired — please sign in again and retry deletion.');
      }

      const jwt = sessionData.session.access_token;
      const { error } = await invokeDeleteCascade(user.id, jwt);

      if (error) {
        const message = error.message || error.toString();
        if (error.status === 401 || error.status === 403) {
          throw new Error('Your session expired — please sign in again and retry deletion.');
        }
        throw new Error(`Deletion failed: ${message}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Account deleted successfully',
        text2: 'You will be redirected.',
      });

      try {
        await notificationService.removeAllPushTokens();
      } catch (pushErr) {
        console.warn('⚠️ Failed to remove push tokens:', pushErr);
      }

      await supabase.auth.signOut();
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      router.replace('/login');
    } catch (err: any) {
      console.error('❌ Error deleting account:', err);
      const message = err?.message || 'Deletion failed — please try again later.';
      setDeleteError(message);
      Toast.show({
        type: 'error',
        text1: 'Deletion failed',
        text2: message,
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (err: any) {
      console.error('❌ Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const openPrivacyPolicy = () => {
    router.push('/legal/privacy-policy');
  };

  const openTermsOfService = () => {
    router.push('/legal/terms-of-service');
  };

  const openReceipts = () => {
    router.push('/receipts');
  };

  const openContactSupport = () => {
    router.push('/legal/contact-support');
  };

  const explainAndRequestPermission = async () => {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Enable Notifications',
        'We use notifications to alert you about new jobs at your college, job acceptance, comments, and payments. Do you want to allow notifications?',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Allow',
            onPress: async () => {
              const token = await notificationService.registerForPushNotifications();
              resolve(!!token);
            },
          },
        ],
        { cancelable: true }
      );
    });
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!isAuthenticated) {
      Toast.show({ type: 'info', text1: 'Please sign in to manage notifications' });
      return;
    }
    try {
      setLoadingNotifications(true);
      if (value) {
        const granted = await explainAndRequestPermission();
        if (!granted) {
          setNotificationsEnabled(false);
          return;
        }
        setNotificationsEnabled(true);
        Toast.show({ type: 'success', text1: 'Notifications enabled' });
      } else {
        await notificationService.removeAllTokensForUser();
        setNotificationsEnabled(false);
        Toast.show({ type: 'success', text1: 'Notifications disabled' });
      }
    } catch (error: any) {
      console.error('❌ Error updating notifications:', error);
      Toast.show({ type: 'error', text1: 'Failed to update notifications' });
    } finally {
      setLoadingNotifications(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to access settings</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Campus</Text>
              <Text style={styles.infoValue}>{userCampus?.name || 'Loading...'}</Text>
            </View>
          </View>
        </View>

        {/* Payouts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payouts</Text>
          <View style={styles.card}>
            <View style={styles.payoutStatus}>
              <Text style={styles.payoutLabel}>Status:</Text>
              <Text style={[styles.payoutValue, payoutsEnabled ? styles.enabled : styles.disabled]}>
                {payoutsEnabled ? '✅ Enabled' : '❌ Disabled'}
              </Text>
            </View>
            
            {!payoutsEnabled && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ You must enable payouts before you can post or accept jobs.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, settingUpPayouts && styles.buttonDisabled]}
              onPress={handleSetupPayouts}
              disabled={settingUpPayouts}
            >
              <Text style={styles.actionButtonText}>
                {settingUpPayouts ? 'Setting up...' : payoutsEnabled ? 'Manage Payouts' : 'Enable Payouts'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, checkingPayouts && styles.buttonDisabled]}
              onPress={handleCheckPayoutStatus}
              disabled={checkingPayouts}
            >
              <Text style={styles.secondaryButtonText}>
                {checkingPayouts ? 'Checking...' : 'Refresh Payout Status'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Blocked Users - Apple Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          <View style={styles.card}>
            {loadingBlocked ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2A5EEA" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : blockedUsers.length === 0 ? (
              <Text style={styles.emptyText}>No blocked users</Text>
            ) : (
              blockedUsers.map((block, index) => (
                <View key={block.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.blockedUserItem}>
                    <View style={styles.blockedUserInfo}>
                      <Text style={styles.blockedUsername}>
                        {block.blocked_user?.username || 'Unknown'}
                      </Text>
                      <Text style={styles.blockedEmail}>
                        {block.blocked_user?.email || ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockButton}
                      onPress={() => handleUnblock(block.blocked_user_id, block.blocked_user?.username)}
                    >
                      <Text style={styles.unblockButtonText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.notificationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Enable push notifications</Text>
                <Text style={styles.notificationSubtext}>
                  New college jobs, job acceptance, comments, and payment updates.
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={loadingNotifications}
              />
            </View>
            {loadingNotifications && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2A5EEA" />
                <Text style={styles.loadingText}>Updating...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payments & Receipts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments & Receipts</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={openReceipts}>
              <Text style={styles.menuItemText}>Receipts</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Support</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={openPrivacyPolicy}>
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={openTermsOfService}>
              <Text style={styles.menuItemText}>Terms of Service</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={openContactSupport}>
              <Text style={styles.menuItemText}>Contact Support</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, deletingAccount && styles.buttonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>dormate v1.0.0</Text>
          <Text style={styles.footerText}>© 2025 dormate. All rights reserved.</Text>
        </View>
      </ScrollView>
      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingAccount) setShowDeleteModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.modalText}>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </Text>
            <Text style={styles.modalText}>Type DELETE to confirm.</Text>
            <TextInput
              style={styles.confirmInput}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deletingAccount}
              placeholder="DELETE"
              placeholderTextColor="#94A3B8"
            />
            {deleteError ? <Text style={styles.errorTextInline}>{deleteError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.modalButton]}
                onPress={() => {
                  if (!deletingAccount) {
                    setShowDeleteModal(false);
                    setDeleteError('');
                  }
                }}
                disabled={deletingAccount}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  styles.modalButton,
                  (deletingAccount || deleteConfirmation.trim().toUpperCase() !== 'DELETE') && styles.buttonDisabled,
                ]}
                onPress={performDeleteAccount}
                disabled={deletingAccount || deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.deleteButtonText}>Confirm Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  infoValue: {
    fontSize: 16,
    color: "#0F172A",
    flex: 1,
    textAlign: "right",
  },
  payoutStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  payoutLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  enabled: {
    color: "#10B981",
  },
  disabled: {
    color: "#EF4444",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: "#2A5EEA",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#0F172A",
  },
  menuItemArrow: {
    fontSize: 24,
    color: "#94A3B8",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  signOutButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  signOutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
  },
  errorTextInline: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: 4,
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748B",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
  blockedUserItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  blockedUserInfo: {
    flex: 1,
  },
  blockedUsername: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  blockedEmail: {
    fontSize: 14,
    color: "#64748B",
  },
  unblockButton: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notificationSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 16,
  },
});

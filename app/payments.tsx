
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { supabaseApi } from "@/services/supabaseApi";
import Toast from 'react-native-toast-message';

interface Payment {
  id: string;
  job_id: string;
  payer_user_id: string;
  payee_user_id: string;
  job_price_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  total_paid_cents: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  job?: {
    id: string;
    title: string;
  };
  payer?: {
    id: string;
    username: string;
    email: string;
  };
  payee?: {
    id: string;
    username: string;
    email: string;
  };
}

export default function Payments() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [sentPayments, setSentPayments] = useState<Payment[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    if (isAuthenticated) {
      loadPayments();
    }
  }, [isAuthenticated]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      console.log('💳 Loading payments...');

      const { sent, received } = await supabaseApi.getPayments();

      console.log('✅ Payments loaded:', {
        sent: sent.length,
        received: received.length,
      });

      // Don't treat empty results as errors - sent || [] is fine
      setSentPayments(sent || []);
      setReceivedPayments(received || []);
    } catch (err: any) {
      console.error('❌ Error loading payments:', err);
      
      // Handle RLS errors gracefully (check error.code === 'PGRST301' or similar)
      if (err.code === 'PGRST301' || err.message?.includes('permission')) {
        console.log('⚠️ Permission error, showing empty state');
        setSentPayments([]);
        setReceivedPayments([]);
        // Don't show error toast for permission errors - just show empty state
      } else {
        // Show user-friendly error messages, not raw Supabase errors
        Toast.show({
          type: 'error',
          text1: 'Failed to load payments',
          text2: 'Please try again later',
        });
      }
    } finally {
      // Ensure error state doesn't block UI unnecessarily
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return `$${(cents / 100).toFixed(2)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'processing':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      case 'refunded':
        return '#6366F1';
      default:
        return '#94A3B8';
    }
  };

  const renderPaymentCard = (payment: Payment, type: 'sent' | 'received') => {
    const otherUser = type === 'sent' ? payment.payee : payment.payer;
    const amount = type === 'sent' ? payment.total_paid_cents : payment.net_amount_cents;

    return (
      <TouchableOpacity
        key={payment.id}
        style={styles.paymentCard}
        onPress={() => router.push(`/payment-receipt/${payment.id}`)}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.paymentInfo}>
            <Text style={styles.jobTitle}>{payment.job?.title || 'Unknown Job'}</Text>
            <Text style={styles.username}>
              {type === 'sent' ? 'To: ' : 'From: '}
              {otherUser?.username || 'Unknown'}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={[styles.amount, type === 'sent' ? styles.amountSent : styles.amountReceived]}>
              {type === 'sent' ? '-' : '+'}{formatAmount(amount, payment.currency)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
              <Text style={styles.statusText}>{payment.status}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(payment.created_at)}</Text>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to view payments</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💳 Payments</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Sent ({sentPayments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received ({receivedPayments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2A5EEA" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'sent' ? (
            sentPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No sent payments</Text>
                <Text style={styles.emptyStateText}>
                  Payments you make to workers will appear here
                </Text>
              </View>
            ) : (
              sentPayments.map(payment => renderPaymentCard(payment, 'sent'))
            )
          ) : (
            receivedPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No received payments</Text>
                <Text style={styles.emptyStateText}>
                  Payments you receive from job posters will appear here
                </Text>
              </View>
            ) : (
              receivedPayments.map(payment => renderPaymentCard(payment, 'received'))
            )
          )}
        </ScrollView>
      )}
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#2A5EEA",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2A5EEA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: "#64748B",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  amountSent: {
    color: "#EF4444",
  },
  amountReceived: {
    color: "#10B981",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
    textTransform: "uppercase",
  },
  date: {
    fontSize: 12,
    color: "#94A3B8",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
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
});

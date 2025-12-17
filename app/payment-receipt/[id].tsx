
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
  stripe_fee_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  total_paid_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  stripe_charge_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  job?: {
    id: string;
    title: string;
    description: string;
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

export default function PaymentReceipt() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAuthenticated, user } = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadPayment();
    }
  }, [isAuthenticated, id]);

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('💳 Loading payment receipt:', id);

      const paymentData = await supabaseApi.getPayment(id as string);

      console.log('✅ Payment receipt loaded:', paymentData.id);
      setPayment(paymentData);
    } catch (err: any) {
      console.error('❌ Error loading payment receipt:', err);
      
      // Handle RLS/permission errors gracefully
      // Validate user is payer OR payee before showing error
      if (err.message?.includes('permission')) {
        setError('You do not have permission to view this receipt');
      } else if (err.message?.includes('not found')) {
        // Show "Receipt not found" only if truly missing, not on permission errors
        setError('Receipt not found');
      } else {
        setError('Failed to load payment receipt');
        Toast.show({
          type: 'error',
          text1: 'Failed to load receipt',
          text2: 'Please try again later',
        });
      }
    } finally {
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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to view receipts</Text>
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
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </View>
    );
  }

  if (error || !payment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || 'Receipt not found'}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPayer = payment.payer_user_id === user?.id;
  const isPayee = payment.payee_user_id === user?.id;

  // Validate user is payer or payee
  if (!isPayer && !isPayee) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>You do not have permission to view this receipt</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
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
        <Text style={styles.title}>🧾 Payment Receipt</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.receiptCard}>
          {/* Status Badge */}
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(payment.status) }]}>
            <Text style={styles.statusTextLarge}>{payment.status.toUpperCase()}</Text>
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>
              {isPayer ? 'Amount Paid' : 'Amount Received'}
            </Text>
            <Text style={styles.amountLarge}>
              {formatAmount(isPayer ? payment.total_paid_cents : payment.net_amount_cents, payment.currency)}
            </Text>
          </View>

          {/* Job Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job Title</Text>
              <Text style={styles.detailValue}>{payment.job?.title || 'Unknown'}</Text>
            </View>
            {payment.job?.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{payment.job.description}</Text>
              </View>
            )}
          </View>

          {/* Payment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job Price</Text>
              <Text style={styles.detailValue}>
                {formatAmount(payment.job_price_cents, payment.currency)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Platform Fee (10%)</Text>
              <Text style={styles.detailValue}>
                -{formatAmount(payment.platform_fee_cents, payment.currency)}
              </Text>
            </View>
            {payment.stripe_fee_cents > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stripe Fee</Text>
                <Text style={styles.detailValue}>
                  -{formatAmount(payment.stripe_fee_cents, payment.currency)}
                </Text>
              </View>
            )}
            <View style={[styles.detailRow, styles.detailRowTotal]}>
              <Text style={styles.detailLabelTotal}>
                {isPayer ? 'Total Paid' : 'Net Amount'}
              </Text>
              <Text style={styles.detailValueTotal}>
                {formatAmount(isPayer ? payment.total_paid_cents : payment.net_amount_cents, payment.currency)}
              </Text>
            </View>
          </View>

          {/* Parties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parties</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payer</Text>
              <Text style={styles.detailValue}>
                {payment.payer?.username || 'Unknown'}
                {isPayer && ' (You)'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payee</Text>
              <Text style={styles.detailValue}>
                {payment.payee?.username || 'Unknown'}
                {isPayee && ' (You)'}
              </Text>
            </View>
          </View>

          {/* Transaction Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Info</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(payment.created_at)}</Text>
            </View>
            {payment.completed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed</Text>
                <Text style={styles.detailValue}>{formatDate(payment.completed_at)}</Text>
              </View>
            )}
            {payment.stripe_payment_intent_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment ID</Text>
                <Text style={[styles.detailValue, styles.monospace]}>
                  {payment.stripe_payment_intent_id.substring(0, 20)}...
                </Text>
              </View>
            )}
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ This is your payment receipt. Keep it for your records.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  receiptCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadgeLarge: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
    letterSpacing: 1,
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  amountLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  amountLarge: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#0F172A",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  detailLabelTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  detailValueTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2A5EEA",
    flex: 1,
    textAlign: "right",
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#0369A1",
    lineHeight: 20,
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

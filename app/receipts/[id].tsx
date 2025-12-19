import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { supabaseApi } from "@/services/supabaseApi";
import Toast from "react-native-toast-message";

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
  status: string;
  created_at: string;
  completed_at: string | null;
  stripe_payment_intent_id: string | null;
  job?: {
    id: string;
    title: string;
    description?: string;
  };
}

export default function ReceiptDetail() {
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
      const result = await supabaseApi.getPayment(id as string);
      setPayment(result as Payment);
    } catch (err: any) {
      console.error("❌ Error loading receipt:", err);
      const message =
        err?.message?.includes("permission")
          ? "You do not have permission to view this receipt"
          : err?.message?.includes("not found")
          ? "Receipt not found"
          : "Failed to load receipt";
      setError(message);
      Toast.show({
        type: "error",
        text1: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents?: number | null, currency?: string | null) => {
    if (cents === null || cents === undefined) return "—";
    return `$${(cents / 100).toFixed(2)} ${(currency || "USD").toUpperCase()}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to view receipts</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/login")}>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || "Receipt not found"}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPayer = payment.payer_user_id === user?.id;
  const isPayee = payment.payee_user_id === user?.id;

  if (!isPayer && !isPayee) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🧾 Receipt</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.receiptCard}>
          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{payment.status}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Payment ID</Text>
            <Text style={styles.value}>{payment.stripe_payment_intent_id || payment.id}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Job Title</Text>
            <Text style={styles.value}>{payment.job?.title || "Unknown Job"}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(payment.created_at)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Total Paid</Text>
            <Text style={styles.value}>{formatAmount(payment.total_paid_cents, payment.currency)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Platform Fee</Text>
            <Text style={styles.value}>
              -{formatAmount(payment.platform_fee_cents, payment.currency)}
              {payment.platform_fee_percent !== undefined && payment.platform_fee_percent !== null
                ? ` (${payment.platform_fee_percent.toFixed(2)}%)`
                : ""}
            </Text>
          </View>

          {payment.stripe_fee_cents > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Stripe Fee</Text>
              <Text style={styles.value}>
                -{formatAmount(payment.stripe_fee_cents, payment.currency)}
                {payment.stripe_fee_percent !== undefined && payment.stripe_fee_percent !== null
                  ? ` (${payment.stripe_fee_percent.toFixed(2)}%)`
                  : ""}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>{isPayer ? "Net Amount" : "Net to You"}</Text>
            <Text style={styles.value}>{formatAmount(payment.net_amount_cents, payment.currency)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: { marginBottom: 12 },
  backButtonText: { fontSize: 16, color: "#2A5EEA", fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold", color: "#0F172A" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  receiptCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#64748B", textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 4 },
  loadingText: { marginTop: 12, fontSize: 16, color: "#475569" },
  errorText: { fontSize: 16, color: "#EF4444", textAlign: "center", marginBottom: 12 },
  button: { marginTop: 8, backgroundColor: "#2A5EEA", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});


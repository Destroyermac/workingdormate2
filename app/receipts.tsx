import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEffect, useMemo, useState } from "react";
import { supabaseApi } from "@/services/supabaseApi";
import Toast from "react-native-toast-message";

type ReceiptRole = "sent" | "received";

interface Receipt {
  id: string;
  job_id: string;
  payer_user_id?: string | null;
  payee_user_id?: string | null;
  job_price_cents?: number | null;
  amount_total?: number | null;
  stripe_fee_cents?: number | null;
  stripe_fee?: number | null;
  platform_fee_cents?: number | null;
  platform_fee?: number | null;
  net_amount_cents?: number | null;
  total_paid_cents?: number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  job?: {
    id: string;
    title: string;
  };
}

export default function Receipts() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Array<Receipt & { role: ReceiptRole }>>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadReceipts();
    }
  }, [isAuthenticated]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const { sent, received } = await supabaseApi.getPayments();

      const normalized: Array<Receipt & { role: ReceiptRole }> = [
        ...(sent || []).map((r: Receipt) => ({ ...r, role: "sent" })),
        ...(received || []).map((r: Receipt) => ({ ...r, role: "received" })),
      ];

      setReceipts(
        normalized.sort((a, b) => {
          const aDate = new Date(a.timestamp || a.created_at || "").getTime();
          const bDate = new Date(b.timestamp || b.created_at || "").getTime();
          return bDate - aDate;
        }),
      );
    } catch (err: any) {
      console.error("❌ Error loading receipts:", err);
      Toast.show({
        type: "error",
        text1: "Failed to load receipts",
        text2: "Please try again later",
      });
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents?: number | null, currency?: string | null) => {
    if (cents === undefined || cents === null) return "—";
    return `$${(cents / 100).toFixed(2)} ${(currency || "USD").toUpperCase()}`;
  };

  const getStripeFee = (receipt: Receipt) =>
    receipt.stripe_fee_cents ?? receipt.stripe_fee ?? 0;

  const getPlatformFee = (receipt: Receipt) =>
    receipt.platform_fee_cents ?? receipt.platform_fee ?? 0;

  const getTotal = (receipt: Receipt, role: ReceiptRole) => {
    if (role === "sent") {
      return receipt.total_paid_cents ?? receipt.amount_total ?? receipt.job_price_cents ?? 0;
    }
    return receipt.net_amount_cents ?? receipt.amount_total ?? receipt.job_price_cents ?? 0;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const renderReceipt = (receipt: Receipt & { role: ReceiptRole }) => {
    const amount = getTotal(receipt, receipt.role);
    const stripeFee = getStripeFee(receipt);
    const platformFee = getPlatformFee(receipt);
    const dateValue = formatDate(receipt.timestamp || receipt.created_at || "");
    const isSent = receipt.role === "sent";

    return (
      <TouchableOpacity
        key={receipt.id}
        style={styles.receiptCard}
        onPress={() => router.push(`/receipts/${receipt.id}`)}
      >
        <View style={styles.headerRow}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{receipt.job?.title || "Job"}</Text>
            <Text style={styles.roleText}>{isSent ? "Sent" : "Received"}</Text>
          </View>
          <Text style={[styles.amount, isSent ? styles.amountSent : styles.amountReceived]}>
            {isSent ? "-" : "+"}
            {formatAmount(amount, receipt.currency || "USD")}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Stripe fee</Text>
          <Text style={styles.metaValue}>{formatAmount(stripeFee, receipt.currency || "USD")}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Platform fee</Text>
          <Text style={styles.metaValue}>{formatAmount(platformFee, receipt.currency || "USD")}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Timestamp</Text>
          <Text style={styles.metaValue}>{dateValue}</Text>
        </View>
      </TouchableOpacity>
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🧾 Receipts</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2A5EEA" />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {receipts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No receipts yet</Text>
              <Text style={styles.emptyStateText}>
                Payments you make or receive will show up here with fee breakdowns.
              </Text>
            </View>
          ) : (
            receipts.map(renderReceipt)
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  receiptCard: {
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: "#64748B",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
  },
  amountSent: {
    color: "#EF4444",
  },
  amountReceived: {
    color: "#10B981",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
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
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2A5EEA",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});


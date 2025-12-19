import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ReportType = "Spam" | "Inappropriate Content" | "Other";

interface ReportFormProps {
  targetId: string; // job, post, or user being reported
  onSubmitted?: () => void;
}

export default function ReportForm({ targetId, onSubmitted }: ReportFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const reportTypeOptions: ReportType[] = useMemo(
    () => ["Spam", "Inappropriate Content", "Other"],
    []
  );

  const validate = () => {
    if (!user?.id) {
      Toast.show({ type: "error", text1: "You must be signed in to report." });
      return false;
    }
    if (!reportType) {
      Toast.show({ type: "error", text1: "Please select a report type." });
      return false;
    }
    if (!description.trim()) {
      Toast.show({ type: "error", text1: "Please add a description." });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = {
        user_id: user?.id,
        target_id: targetId,
        report_type: reportType,
        description: description.trim(),
      };

      const { error } = await supabase.from("reports").insert(payload);
      if (error) throw error;

      Toast.show({ type: "success", text1: "Report submitted" });
      if (onSubmitted) {
        onSubmitted();
      } else {
        router.back();
      }
    } catch (err: any) {
      console.error("❌ Error submitting report:", err);
      Toast.show({
        type: "error",
        text1: "Failed to submit report",
        text2: err?.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Report</Text>

        <Text style={styles.label}>Report Type *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setTypeMenuOpen((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Select report type"
        >
          <Text style={styles.dropdownText}>
            {reportType || "Select a type"}
          </Text>
          <Text style={styles.dropdownArrow}>⌄</Text>
        </TouchableOpacity>
        {typeMenuOpen && (
          <View style={styles.dropdownMenu}>
            {reportTypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownItem}
                onPress={() => {
                  setReportType(opt);
                  setTypeMenuOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${opt}`}
              >
                <Text style={styles.dropdownItemText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the issue..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!submitting}
          accessibilityLabel="Description of the report"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit report"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        {/* Hidden / implicit fields (not rendered):
            user_id = user?.id
            target_id = targetId
            report_type = reportType
            description = description
            These are included in payload sent to Supabase. */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: "white",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#0F172A",
  },
  dropdownArrow: {
    fontSize: 18,
    color: "#94A3B8",
  },
  dropdownMenu: {
    backgroundColor: "white",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: {
    backgroundColor: "white",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#0F172A",
    minHeight: 140,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#2A5EEA",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#2A5EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 8,
  },
});


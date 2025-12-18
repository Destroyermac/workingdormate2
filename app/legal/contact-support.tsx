
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function ContactSupport() {
  const router = useRouter();
  const { user } = useAuth();
  const _unused = [TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, useState];
  void _unused;
  void router;
  void user;

  return (
    <View style={styles.container}>
      <Text style={styles.primaryText}>
        Please email support@dormate.app {"\n"}with any questions, issues, or to report a problem.
      </Text>
      <Text style={styles.secondaryText}>
        A Dormate team member will reach out as soon as possible.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  primaryText: {
    fontSize: 17,
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 24,
  },
  secondaryText: {
    marginTop: 12,
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    lineHeight: 22,
  },
});

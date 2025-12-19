
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function ContactSupport() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Contact Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.primaryText}>
          Please email mac@dormate.org with any questions, issues, or to report a problem.
        </Text>
        <Text style={styles.secondaryText}>
          A Dormate team member will get back to you as soon as we can.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
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


import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Text style={styles.intro}>
          dormate ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>1.1 Information You Provide</Text>
        <Text style={styles.paragraph}>
          We collect information you provide directly to us, including:
        </Text>
        <Text style={styles.bulletPoint}>- University email address</Text>
        <Text style={styles.bulletPoint}>- Username</Text>
        <Text style={styles.bulletPoint}>- Password (encrypted)</Text>
        <Text style={styles.bulletPoint}>- Job postings and descriptions</Text>
        <Text style={styles.bulletPoint}>- Messages and communications with other users</Text>
        <Text style={styles.bulletPoint}>- Payment information (processed by Stripe)</Text>
        <Text style={styles.bulletPoint}>- Profile information</Text>

        <Text style={styles.subsectionTitle}>1.2 Automatically Collected Information</Text>
        <Text style={styles.paragraph}>
          When you use our Service, we automatically collect:
        </Text>
        <Text style={styles.bulletPoint}>- Device information (type, operating system, unique identifiers)</Text>
        <Text style={styles.bulletPoint}>- Usage data (features used, time spent, interactions)</Text>
        <Text style={styles.bulletPoint}>- Log data (IP address, access times, pages viewed)</Text>
        <Text style={styles.bulletPoint}>- Location data (with your permission)</Text>
        <Text style={styles.bulletPoint}>- Crash reports and performance data</Text>

        <Text style={styles.subsectionTitle}>1.3 Information from Third Parties</Text>
        <Text style={styles.paragraph}>
          We receive information from:
        </Text>
        <Text style={styles.bulletPoint}>- Stripe (payment processing and verification)</Text>
        <Text style={styles.bulletPoint}>- Your university (email verification)</Text>
        <Text style={styles.bulletPoint}>- Analytics providers</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bulletPoint}>- Provide, maintain, and improve our Service</Text>
        <Text style={styles.bulletPoint}>- Create and manage your account</Text>
        <Text style={styles.bulletPoint}>- Verify your university affiliation</Text>
        <Text style={styles.bulletPoint}>- Process payments and transactions</Text>
        <Text style={styles.bulletPoint}>- Connect you with other users in your campus marketplace</Text>
        <Text style={styles.bulletPoint}>- Send you notifications about jobs, messages, and updates</Text>
        <Text style={styles.bulletPoint}>- Respond to your requests and provide customer support</Text>
        <Text style={styles.bulletPoint}>- Detect and prevent fraud, abuse, and security issues</Text>
        <Text style={styles.bulletPoint}>- Comply with legal obligations</Text>
        <Text style={styles.bulletPoint}>- Analyze usage patterns and improve user experience</Text>
        <Text style={styles.bulletPoint}>- Send administrative messages and updates</Text>

        <Text style={styles.sectionTitle}>3. How We Share Your Information</Text>
        
        <Text style={styles.subsectionTitle}>3.1 With Other Users</Text>
        <Text style={styles.paragraph}>
          Your username, job postings, and messages are visible to other users in your campus marketplace. We do not share your email address or payment information with other users.
        </Text>

        <Text style={styles.subsectionTitle}>3.2 With Service Providers</Text>
        <Text style={styles.paragraph}>
          We share information with third-party service providers who perform services on our behalf:
        </Text>
        <Text style={styles.bulletPoint}>- Stripe (payment processing)</Text>
        <Text style={styles.bulletPoint}>- Supabase (database and authentication)</Text>
        <Text style={styles.bulletPoint}>- Cloud hosting providers</Text>
        <Text style={styles.bulletPoint}>- Analytics providers</Text>
        <Text style={styles.bulletPoint}>- Email service providers</Text>

        <Text style={styles.subsectionTitle}>3.3 For Legal Reasons</Text>
        <Text style={styles.paragraph}>
          We may disclose your information if required by law or if we believe it is necessary to:
        </Text>
        <Text style={styles.bulletPoint}>- Comply with legal obligations or court orders</Text>
        <Text style={styles.bulletPoint}>- Protect our rights, property, or safety</Text>
        <Text style={styles.bulletPoint}>- Protect the rights, property, or safety of our users</Text>
        <Text style={styles.bulletPoint}>- Prevent fraud or abuse</Text>
        <Text style={styles.bulletPoint}>- Respond to government requests</Text>

        <Text style={styles.subsectionTitle}>3.4 Business Transfers</Text>
        <Text style={styles.paragraph}>
          If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your information, including:
        </Text>
        <Text style={styles.bulletPoint}>- Encryption of data in transit and at rest</Text>
        <Text style={styles.bulletPoint}>- Secure authentication and access controls</Text>
        <Text style={styles.bulletPoint}>- Regular security audits and updates</Text>
        <Text style={styles.bulletPoint}>- Employee training on data protection</Text>
        <Text style={styles.paragraph}>
          However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to:
        </Text>
        <Text style={styles.bulletPoint}>- Comply with legal obligations</Text>
        <Text style={styles.bulletPoint}>- Resolve disputes</Text>
        <Text style={styles.bulletPoint}>- Enforce our agreements</Text>
        <Text style={styles.paragraph}>
          When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it by law.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>
        
        <Text style={styles.subsectionTitle}>6.1 Access and Update</Text>
        <Text style={styles.paragraph}>
          You can access and update your account information at any time through the app settings.
        </Text>

        <Text style={styles.subsectionTitle}>6.2 Delete Your Account</Text>
        <Text style={styles.paragraph}>
          You can delete your account at any time through the app settings. This will permanently delete your personal information, subject to legal retention requirements.
        </Text>

        <Text style={styles.subsectionTitle}>6.3 Opt-Out of Communications</Text>
        <Text style={styles.paragraph}>
          You can opt out of promotional emails by following the unsubscribe link. You cannot opt out of administrative messages necessary for the Service.
        </Text>

        <Text style={styles.subsectionTitle}>6.4 Location Data</Text>
        <Text style={styles.paragraph}>
          You can disable location services through your device settings. This may limit some features of the Service.
        </Text>

        <Text style={styles.subsectionTitle}>6.5 Do Not Track</Text>
        <Text style={styles.paragraph}>
          We do not currently respond to "Do Not Track" signals from browsers.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our Service is not intended for users under 18 years of age. We do not knowingly collect information from children under 18. If we learn that we have collected information from a child under 18, we will delete it immediately.
        </Text>

        <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our Service, you consent to the transfer of your information to the United States and other countries.
        </Text>

        <Text style={styles.sectionTitle}>9. California Privacy Rights</Text>
        <Text style={styles.paragraph}>
          If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
        </Text>
        <Text style={styles.bulletPoint}>- Right to know what personal information we collect</Text>
        <Text style={styles.bulletPoint}>- Right to delete your personal information</Text>
        <Text style={styles.bulletPoint}>- Right to opt-out of the sale of personal information (we do not sell your information)</Text>
        <Text style={styles.bulletPoint}>- Right to non-discrimination for exercising your rights</Text>
        <Text style={styles.paragraph}>
          To exercise these rights, contact us through the Contact Support page.
        </Text>

        <Text style={styles.sectionTitle}>10. European Privacy Rights</Text>
        <Text style={styles.paragraph}>
          If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):
        </Text>
        <Text style={styles.bulletPoint}>- Right to access your personal data</Text>
        <Text style={styles.bulletPoint}>- Right to rectification of inaccurate data</Text>
        <Text style={styles.bulletPoint}>- Right to erasure ("right to be forgotten")</Text>
        <Text style={styles.bulletPoint}>- Right to restrict processing</Text>
        <Text style={styles.bulletPoint}>- Right to data portability</Text>
        <Text style={styles.bulletPoint}>- Right to object to processing</Text>
        <Text style={styles.bulletPoint}>- Right to withdraw consent</Text>
        <Text style={styles.paragraph}>
          To exercise these rights, contact us through the Contact Support page.
        </Text>

        <Text style={styles.sectionTitle}>11. Third-Party Links</Text>
        <Text style={styles.paragraph}>
          Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>12. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on the Service and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the new Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy or our privacy practices, please contact us through the Contact Support page in the app settings.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using dormate, you acknowledge that you have read and understood this Privacy Policy.
          </Text>
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
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    fontStyle: "italic",
  },
  intro: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 16,
  },
  footer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#0369A1",
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
  },
});

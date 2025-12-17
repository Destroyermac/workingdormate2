
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function TermsOfService() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using dormate ("the Service", "the App", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.paragraph}>
          The Service is available only to students who:
        </Text>
        <Text style={styles.bulletPoint}>- Are at least 18 years old</Text>
        <Text style={styles.bulletPoint}>- Have a valid university email address from a supported institution</Text>
        <Text style={styles.bulletPoint}>- Are currently enrolled students in good standing</Text>
        <Text style={styles.bulletPoint}>- Have the legal capacity to enter into binding contracts</Text>

        <Text style={styles.sectionTitle}>3. Account Registration</Text>
        <Text style={styles.paragraph}>
          To use the Service, you must:
        </Text>
        <Text style={styles.bulletPoint}>- Provide accurate, current, and complete information during registration</Text>
        <Text style={styles.bulletPoint}>- Maintain and promptly update your account information</Text>
        <Text style={styles.bulletPoint}>- Maintain the security of your account credentials</Text>
        <Text style={styles.bulletPoint}>- Notify us immediately of any unauthorized access or security breach</Text>
        <Text style={styles.bulletPoint}>- Accept full responsibility for all activities under your account</Text>
        <Text style={styles.bulletPoint}>- Not share your account with others or create multiple accounts</Text>

        <Text style={styles.sectionTitle}>4. Campus Marketplaces</Text>
        <Text style={styles.paragraph}>
          dormate operates separate marketplaces for each supported university. Users can only:
        </Text>
        <Text style={styles.bulletPoint}>- View jobs posted within their campus marketplace</Text>
        <Text style={styles.bulletPoint}>- Post jobs visible only to their campus community</Text>
        <Text style={styles.bulletPoint}>- Accept jobs from users within their campus</Text>
        <Text style={styles.bulletPoint}>- Interact with users from their own campus</Text>
        <Text style={styles.paragraph}>
          Cross-campus interactions are not permitted. Each marketplace is isolated to ensure safety and relevance.
        </Text>

        <Text style={styles.sectionTitle}>5. Job Postings</Text>
        <Text style={styles.paragraph}>
          When posting a job, you agree to:
        </Text>
        <Text style={styles.bulletPoint}>- Provide accurate, complete, and truthful job descriptions</Text>
        <Text style={styles.bulletPoint}>- Offer fair and reasonable compensation for services</Text>
        <Text style={styles.bulletPoint}>- Not post illegal, fraudulent, misleading, or deceptive jobs</Text>
        <Text style={styles.bulletPoint}>- Pay the agreed amount upon satisfactory job completion</Text>
        <Text style={styles.bulletPoint}>- Have enabled payouts through Stripe before posting</Text>
        <Text style={styles.bulletPoint}>- Not request services that violate university policies or local laws</Text>
        <Text style={styles.bulletPoint}>- Treat workers with respect and professionalism</Text>

        <Text style={styles.sectionTitle}>6. Job Acceptance and Performance</Text>
        <Text style={styles.paragraph}>
          When accepting a job, you agree to:
        </Text>
        <Text style={styles.bulletPoint}>- Complete the job as described to the best of your ability</Text>
        <Text style={styles.bulletPoint}>- Communicate professionally and promptly with the job poster</Text>
        <Text style={styles.bulletPoint}>- Deliver quality work in a timely manner</Text>
        <Text style={styles.bulletPoint}>- Have enabled payouts through Stripe before accepting</Text>
        <Text style={styles.bulletPoint}>- Not accept jobs you cannot reasonably complete</Text>
        <Text style={styles.bulletPoint}>- Notify the poster immediately if you cannot complete the job</Text>

        <Text style={styles.sectionTitle}>7. Payments and Fees</Text>
        <Text style={styles.paragraph}>
          All payments are processed through Stripe Connect. By using the Service, you agree to:
        </Text>
        <Text style={styles.bulletPoint}>- Complete Stripe Connect onboarding before posting or accepting jobs</Text>
        <Text style={styles.bulletPoint}>- Comply with Stripe's Terms of Service and policies</Text>
        <Text style={styles.bulletPoint}>- Pay platform fees as disclosed at the time of transaction</Text>
        <Text style={styles.bulletPoint}>- Provide accurate payment information</Text>
        <Text style={styles.bulletPoint}>- Not attempt to circumvent the payment system</Text>
        <Text style={styles.bulletPoint}>- Resolve payment disputes in good faith</Text>
        <Text style={styles.paragraph}>
          Platform fees help maintain and improve the Service. Fees are clearly disclosed before any transaction.
        </Text>

        <Text style={styles.sectionTitle}>8. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>
          You may not:
        </Text>
        <Text style={styles.bulletPoint}>- Use the Service for any illegal purpose or in violation of any laws</Text>
        <Text style={styles.bulletPoint}>- Post fraudulent, misleading, or deceptive job listings</Text>
        <Text style={styles.bulletPoint}>- Harass, abuse, threaten, or harm other users</Text>
        <Text style={styles.bulletPoint}>- Discriminate based on race, gender, religion, or other protected characteristics</Text>
        <Text style={styles.bulletPoint}>- Attempt to circumvent payment systems or fees</Text>
        <Text style={styles.bulletPoint}>- Share your account credentials with others</Text>
        <Text style={styles.bulletPoint}>- Scrape, collect, or harvest user data</Text>
        <Text style={styles.bulletPoint}>- Interfere with or disrupt the Service's operation</Text>
        <Text style={styles.bulletPoint}>- Impersonate others or misrepresent your identity</Text>
        <Text style={styles.bulletPoint}>- Post spam, advertisements, or promotional content</Text>
        <Text style={styles.bulletPoint}>- Use automated systems or bots</Text>
        <Text style={styles.bulletPoint}>- Reverse engineer or attempt to access source code</Text>

        <Text style={styles.sectionTitle}>9. Content Ownership and License</Text>
        <Text style={styles.paragraph}>
          You retain ownership of all content you post on the Service. By posting content, you grant dormate a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your content within the Service for the purpose of operating and improving the platform.
        </Text>
        <Text style={styles.paragraph}>
          You represent and warrant that you own or have the necessary rights to all content you post and that your content does not violate any third-party rights.
        </Text>

        <Text style={styles.sectionTitle}>10. User Disputes</Text>
        <Text style={styles.paragraph}>
          dormate is a platform that connects users. We are not a party to any agreements between users. You are solely responsible for your interactions with other users. We encourage users to:
        </Text>
        <Text style={styles.bulletPoint}>- Communicate clearly and professionally</Text>
        <Text style={styles.bulletPoint}>- Resolve disputes amicably and in good faith</Text>
        <Text style={styles.bulletPoint}>- Document agreements and communications</Text>
        <Text style={styles.bulletPoint}>- Report serious issues through the app's reporting feature</Text>
        <Text style={styles.paragraph}>
          While we may provide tools to facilitate dispute resolution, we are not obligated to mediate or resolve disputes between users.
        </Text>

        <Text style={styles.sectionTitle}>11. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your account at any time, with or without notice, if you:
        </Text>
        <Text style={styles.bulletPoint}>- Violate these Terms or any applicable laws</Text>
        <Text style={styles.bulletPoint}>- Engage in fraudulent or deceptive activity</Text>
        <Text style={styles.bulletPoint}>- Harm other users or the platform</Text>
        <Text style={styles.bulletPoint}>- Fail to pay fees or amounts owed</Text>
        <Text style={styles.bulletPoint}>- Are no longer eligible to use the Service</Text>
        <Text style={styles.paragraph}>
          You may delete your account at any time through the app settings. Upon termination, your right to use the Service immediately ceases. Provisions that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, and limitations of liability.
        </Text>

        <Text style={styles.sectionTitle}>12. Disclaimers and Warranties</Text>
        <Text style={styles.paragraph}>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Text>
        <Text style={styles.paragraph}>
          WE DO NOT WARRANT OR GUARANTEE:
        </Text>
        <Text style={styles.bulletPoint}>- The quality, safety, or legality of jobs or services</Text>
        <Text style={styles.bulletPoint}>- The accuracy or reliability of user-provided information</Text>
        <Text style={styles.bulletPoint}>- That the Service will be uninterrupted, secure, or error-free</Text>
        <Text style={styles.bulletPoint}>- That defects will be corrected</Text>
        <Text style={styles.bulletPoint}>- That disputes will be resolved</Text>
        <Text style={styles.bulletPoint}>- The conduct or identity of any user</Text>

        <Text style={styles.sectionTitle}>13. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DORMATE, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM:
        </Text>
        <Text style={styles.bulletPoint}>- Your use or inability to use the Service</Text>
        <Text style={styles.bulletPoint}>- Any conduct or content of any third party on the Service</Text>
        <Text style={styles.bulletPoint}>- Unauthorized access to or alteration of your data</Text>
        <Text style={styles.bulletPoint}>- Any other matter relating to the Service</Text>
        <Text style={styles.paragraph}>
          IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE PAST SIX MONTHS, OR $100, WHICHEVER IS GREATER.
        </Text>

        <Text style={styles.sectionTitle}>14. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless dormate and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorney's fees, arising out of or in any way connected with:
        </Text>
        <Text style={styles.bulletPoint}>- Your access to or use of the Service</Text>
        <Text style={styles.bulletPoint}>- Your violation of these Terms</Text>
        <Text style={styles.bulletPoint}>- Your violation of any third-party rights</Text>
        <Text style={styles.bulletPoint}>- Your conduct in connection with the Service</Text>

        <Text style={styles.sectionTitle}>15. Privacy</Text>
        <Text style={styles.paragraph}>
          Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your personal information. By using the Service, you consent to our collection and use of personal data as outlined in the Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>16. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the new Terms on the Service and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>17. Governing Law and Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules, except that either party may seek injunctive relief in court.
        </Text>

        <Text style={styles.sectionTitle}>18. Severability</Text>
        <Text style={styles.paragraph}>
          If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
        </Text>

        <Text style={styles.sectionTitle}>19. Entire Agreement</Text>
        <Text style={styles.paragraph}>
          These Terms, together with the Privacy Policy, constitute the entire agreement between you and dormate regarding the Service and supersede all prior agreements and understandings.
        </Text>

        <Text style={styles.sectionTitle}>20. Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions, concerns, or notices regarding these Terms, please contact us through the Contact Support page in the app settings.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using dormate, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
    marginBottom: 24,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 12,
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

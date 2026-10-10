import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from "../lib/theme";

export default function TermsOfServicePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === "web" ? 32 : Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={18} color="#1E1B18" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.effectiveBadge}>
              <Text style={styles.effectiveBadgeText}>OCTOBER 2026</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="document-text" size={13} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.eyebrow}>MAYBEWE • COMMUNITY AGREEMENT & TERMS</Text>
            </View>
            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.subtitle}>
              These terms establish our shared standards of trust, etiquette, and safety for the global MaybeWe solo travel concierge and network.
            </Text>
          </View>

          {/* Section 1: Acceptance & Eligibility */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>1. Acceptance of Terms & Eligibility</Text>
            <Text style={styles.paragraph}>
              By accessing or using MaybeWe across Web, iOS, or Android, you agree to be bound by these Terms of Service. MaybeWe is strictly for adult travelers who are at least 18 years of age. This requirement is enforced during registration through self-reported date-of-birth input validation and database schema check constraints, rather than automated government ID age verification (unless a user voluntarily submits ID documentation to obtain a verification badge). You acknowledge that initial registration constitutes user self-declaration and automated input validation.
            </Text>
          </View>

          {/* Section 2: Authentic Identity & Community Standards */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>2. Authentic Identity & Traveler Conduct</Text>
            <Text style={styles.paragraph}>
              MaybeWe is founded on genuine peer discovery. You agree to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Accurate Representation:</Text> Maintain an authentic, truthful profile reflecting your actual identity and travel intentions without impersonating others.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="heart-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Mutual Courtesy:</Text> Treat all fellow travelers with respect and hospitality across cultural, demographic, and linguistic backgrounds.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="ban-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>No Commercial Solicitation:</Text> You may not use MaybeWe for commercial marketing, multi-level schemes, tour-agency solicitation, or spamming.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 3: Zero-Tolerance UGC Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>3. Zero-Tolerance User-Generated Content Policy</Text>
            <Text style={styles.paragraph}>
              We enforce an uncompromising zero-tolerance standard against abusive content. You strictly agree not to post, publish, message, or transmit:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Harassment & Hate Speech:</Text> Any intimidation, stalking, defamation, discrimination, or abusive messaging.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Explicit or Illegal Content:</Text> Sexually explicit material, pornography, violence, or incitement of unlawful acts.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Fraud & Financial Requests:</Text> Asking strangers for wire transfers, crypto deposits, upfront tour deposits, or banking credentials.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 4: Moderation, Reporting & Bidirectional Blocking */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>4. Community Moderation & Safety Tools</Text>
            <Text style={styles.paragraph}>
              MaybeWe equips all travelers with immediate safety controls:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="flag-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>In-App Reporting:</Text> Every profile, post, and chat contains a direct report action logging incidents to our moderation queue (public.reports).
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="shield-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Bidirectional Blocking:</Text> Blocking another user immediately severs chat communication, feed discovery, and visibility both ways.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="flash-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Immediate Account Action:</Text> Violations of our UGC standards will result in immediate content removal and permanent account termination.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 5: Solo Travel Safety & Assumption of Risk */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>5. Travel Safety Disclaimer & Assumption of Risk</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>PLEASE READ CAREFULLY:</Text> MaybeWe is a software platform connecting independent travelers. We do not operate travel tours, transport services, or physical guiding.
            </Text>
            <View style={[styles.bulletRow, { backgroundColor: "rgba(185, 154, 94, 0.08)", borderColor: "rgba(185, 154, 94, 0.30)", marginTop: 10 }]}>
              <Ionicons name="warning-outline" size={20} color="#B99A5E" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Independent Discretion:</Text> Deciding to meet another traveler, embark on trips together, or explore remote destinations is strictly at your own voluntary discretion and risk. We strongly recommend meeting in well-lit public venues, notifying your emergency contacts, and trusting your instincts.
              </Text>
            </View>
          </View>

          {/* Section 6: Content Ownership & Licensing */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>6. Intellectual Property & Your Content</Text>
            <Text style={styles.paragraph}>
              You retain all ownership of the photographs, captions, and travel stories you publish on MaybeWe. By submitting content, you grant MaybeWe a worldwide, non-exclusive license solely to host, display, and distribute that content to other users in accordance with your chosen visibility settings.
            </Text>
          </View>

          {/* Section 7: Account Deletion & Termination */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>7. Termination & Account Deletion</Text>
            <Text style={styles.paragraph}>
              You may terminate your account at any time without penalty. You can delete your account directly inside the app or through our dedicated deletion portal:
            </Text>
            <TouchableOpacity
              style={styles.deletionBtn}
              onPress={() => router.push("/delete-account")}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#A96F5C" style={{ marginRight: 8 }} />
              <Text style={styles.deletionBtnText}>Go to Account Deletion Portal →</Text>
            </TouchableOpacity>
          </View>

          {/* Section 8: Support & Moderation Inquiries */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>8. Safety Concerns & Support Inquiries</Text>
            <Text style={styles.paragraph}>
              Community assistance, user reports, and moderation requests are handled directly within the application via Settings → Safety & Reporting. You may also contact our team regarding safety concerns, terms violations, or legal notices at:
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:maybewe2026@gmail.com?subject=Safety%20Concern%20-%20MaybeWe")}
              style={styles.contactEmailRow}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
              <Text style={styles.contactEmailText}>maybewe2026@gmail.com</Text>
            </TouchableOpacity>
            <Text style={[styles.paragraph, { marginTop: 6, fontSize: 12, color: "#7D756D" }]}>
              Communications are processed without a guaranteed response timeframe or dedicated support staff.
            </Text>
          </View>

          {/* Related Links */}
          <View style={styles.linksSection}>
            <TouchableOpacity
              style={styles.relatedLinkRow}
              onPress={() => router.push("/privacy")}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#1E1B18" />
              <Text style={styles.relatedLinkText}>Read Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color="#7D756D" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.relatedLinkRow}
              onPress={() => router.push("/delete-account")}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#A96F5C" />
              <Text style={[styles.relatedLinkText, { color: "#A96F5C" }]}>Permanent Account Deletion</Text>
              <Ionicons name="chevron-forward" size={16} color="#7D756D" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              MaybeWe • Quiet Luxury Concierge • Community Governance
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF8F5", // Alabaster French Linen
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    maxWidth: 680,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.75)", // Translucent Silk Ivory
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)", // Hairline Champagne Gold
    padding: 28,
    ...SHADOWS.card,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
  },
  backButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: "#1E1B18",
    marginLeft: 6,
  },
  effectiveBadge: {
    backgroundColor: "#F4EFEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.20)",
  },
  effectiveBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: "#7D756D",
    letterSpacing: 1.2,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197, 168, 128, 0.20)",
    paddingBottom: 18,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: "#B99A5E",
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: "800",
    color: "#1E1B18",
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#6D6862",
    lineHeight: 21,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B18",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#4A453F",
    lineHeight: 20,
  },
  bold: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    color: "#1E1B18",
  },
  bulletList: {
    marginTop: 10,
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(244, 239, 235, 0.55)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.22)",
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#4A453F",
    lineHeight: 18,
  },
  deletionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(169, 111, 92, 0.08)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(169, 111, 92, 0.30)",
    marginTop: 10,
  },
  deletionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#A96F5C",
    fontWeight: "700",
  },
  linksSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(197, 168, 128, 0.20)",
    paddingTop: 16,
    marginTop: 8,
    gap: 8,
  },
  contactEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(185, 154, 94, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(185, 154, 94, 0.28)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  contactEmailText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#B99A5E",
    fontWeight: "700",
  },
  relatedLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
  },
  relatedLinkText: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: "#1E1B18",
    marginLeft: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(197, 168, 128, 0.20)",
    paddingTop: 16,
    marginTop: 16,
    alignItems: "center",
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: "#918E87",
    textAlign: "center",
  },
});

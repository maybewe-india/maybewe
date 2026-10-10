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

export default function PrivacyPolicyPage() {
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
              <Ionicons name="shield-checkmark" size={13} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.eyebrow}>MAYBEWE • DATA GOVERNANCE & PRIVACY</Text>
            </View>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.subtitle}>
              Our commitment to quiet luxury includes uncompromising privacy, zero third-party data tracking, and transparent data rights for solo travelers worldwide.
            </Text>
          </View>

          {/* Section 1: Core Philosophy */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>1. Privacy-First Philosophy</Text>
            <Text style={styles.paragraph}>
              MaybeWe is created to foster genuine, safe real-world travel companionship without surveillance monetization. We do not sell your personal information, rent your contact lists, or embed third-party advertising tracking SDKs. You maintain sovereign ownership of your data at all times.
            </Text>
          </View>

          {/* Section 2: Profile & Account Data */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>2. Traveler Profile & Account Information</Text>
            <Text style={styles.paragraph}>
              When creating an account, we collect only the necessary credentials required to establish a trustworthy travel community:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="person-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Identity & Profile:</Text> Name or display handle, email address, optional biography, travel styles, and profile portrait photograph.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="briefcase-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Journey Intent:</Text> Upcoming destination plans, travel dates, and companion preferences used strictly to facilitate peer matching.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 3: Foreground Spatial Discovery & Location Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>3. Location & Spatial Discovery</Text>
            <Text style={styles.paragraph}>
              Location transparency is a foundational invariant of MaybeWe. We apply strict boundaries to location access:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="navigate-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Foreground-Only GPS:</Text> Location coordinates are accessed exclusively while the application is active in the foreground and upon explicit user permission.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="time-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>15-Minute Ephemeral TTL:</Text> When you opt into "Discoverable Nearby", your spatial presence is automatically purged from active discovery queries after 15 minutes of inactivity.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="close-circle-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Zero Background Daemons:</Text> MaybeWe never runs continuous background location services or tracking daemons while the application is closed.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="map-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Open Infrastructure:</Text> Vector map tiles and geographic points of interest are queried via OpenFreeMap and OpenStreetMap PostGIS databases without proprietary surveillance tokens.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 4: Ephemeral Stories & Public Social Feed */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>4. Stories, Dispatches & Media Uploads</Text>
            <Text style={styles.paragraph}>
              Media shared on MaybeWe is routed through strictly governed Supabase Storage buckets:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="timer-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>24-Hour Ephemeral Stories:</Text> Photos uploaded as Stories automatically expire from active feed and discovery queries 24 hours after publication (enforced via database query filter expires_at > now()).
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="images-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Travel Dispatches:</Text> Published travel journal dispatches and media remain attached to your public profile until you choose to delete them. Deleting a post immediately triggers automated binary cleanup from the storage bucket.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 5: Real-Time Chat & Hangouts */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>5. Private Messaging & Group Hangouts</Text>
            <Text style={styles.paragraph}>
              All direct messages, hangout planning polls, and group interactions are secured by database-level Row-Level Security (RLS) policies. Only authenticated participants belonging to a specific conversation have read access to message history.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 8 }]}>
              Bi-directional safety blocks are strictly enforced: when you block another traveler, all historical messages and active visibility are mutually obscured.
            </Text>
          </View>

          {/* Section 6: Identity Verification & Trust Badge */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>6. Verification Selfies & Trust Credentials</Text>
            <Text style={styles.paragraph}>
              To prevent impersonation and protect solo travelers, MaybeWe offers optional community identity verification:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="lock-closed-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Isolated Storage:</Text> Verification selfie and documentation binaries are stored in dedicated private buckets (verification-selfies and verification-documents). Both buckets are non-public with zero public CDN exposure.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="eye-off-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Restricted Access:</Text> Uploaded files are accessible strictly by the uploading user (scoped to their authenticated user folder) and authorized administrative service roles for moderation review. Other community travelers can only view your verified badge and trust rating.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 7: Emergency Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>7. Emergency Contacts Security</Text>
            <Text style={styles.paragraph}>
              Emergency contact phone numbers and names configured in your Safety settings are transmitted securely over HTTPS/TLS and stored in isolated relational records protected by strict database Row-Level Security (auth.uid() = user_id). They are accessible exclusively to the authenticated owner, never stored with custom client-side encryption, and never shared publicly or visible to other community travelers.
            </Text>
          </View>

          {/* Section 8: Account Deletion & Data Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>8. Your Rights & Permanent Account Deletion</Text>
            <Text style={styles.paragraph}>
              In full compliance with international privacy frameworks (including GDPR, CCPA, and App Store guidelines), you have the right to request full export or permanent destruction of your data at any time:
            </Text>
            <View style={styles.deletionActionCard}>
              <Ionicons name="trash-bin-outline" size={24} color="#A96F5C" style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deletionCardTitle}>Self-Service Account Deletion</Text>
                <Text style={styles.deletionCardText}>
                  Executing an account deletion invokes our dedicated delete-account Edge Function. The function deletes your Supabase Auth user record, sweeps user-owned media across configured storage buckets (including avatars, travel-photos, trip-covers, post-media, story-media, chat-media, hangout-media, verification-selfies, and verification-documents), and triggers a cascading purge of user database records across profile, trip, match, message, story, session, and safety tables. Standard operational server and edge infrastructure access logs may persist temporarily in accordance with cloud infrastructure provider operational defaults.
                </Text>
                <TouchableOpacity
                  style={styles.deletionLinkBtn}
                  onPress={() => router.push("/delete-account")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deletionLinkText}>Access Account Deletion Page →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section 9: Third-Party Services */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>9. Infrastructure & Service Providers</Text>
            <Text style={styles.paragraph}>
              MaybeWe partners exclusively with infrastructure providers adhering to stringent enterprise security standards:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="server-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Supabase (PostgreSQL & Storage):</Text> Database storage, encryption at rest, and secure user authentication.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="map-outline" size={16} color="#C5A880" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>OpenFreeMap & Cloudflare R2:</Text> Open-source vector tile delivery without user-identifying tracking.
                </Text>
              </View>
            </View>
          </View>

          {/* Section 10: Support & Privacy Inquiries */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>10. Privacy Inquiries & Contact</Text>
            <Text style={styles.paragraph}>
              For privacy requests, data inquiries, or account questions, travelers can submit reports directly through in-app channels under Settings → Safety & Reporting, or email our team at:
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:maybewe2026@gmail.com?subject=Privacy%20Inquiry%20-%20MaybeWe")}
              style={styles.contactEmailRow}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
              <Text style={styles.contactEmailText}>maybewe2026@gmail.com</Text>
            </TouchableOpacity>
            <Text style={[styles.paragraph, { marginTop: 6, fontSize: 12, color: "#7D756D" }]}>
              Inquiries are reviewed without a guaranteed response timeframe or dedicated support department.
            </Text>
          </View>

          {/* Related Links */}
          <View style={styles.linksSection}>
            <TouchableOpacity
              style={styles.relatedLinkRow}
              onPress={() => router.push("/terms")}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color="#1E1B18" />
              <Text style={styles.relatedLinkText}>Read Terms of Service</Text>
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
              MaybeWe • Quiet Luxury Concierge • Data Governance Compliance
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
  deletionActionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(169, 111, 92, 0.06)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(169, 111, 92, 0.25)",
    marginTop: 10,
  },
  deletionCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: "#A96F5C",
    fontWeight: "700",
    marginBottom: 4,
  },
  deletionCardText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#5C4B44",
    lineHeight: 18,
    marginBottom: 10,
  },
  deletionLinkBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#A96F5C",
  },
  deletionLinkText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: "#FFFFFF",
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

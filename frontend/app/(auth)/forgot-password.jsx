import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADII, FONTS, SHADOWS } from "../../lib/theme";
import PrimaryButton from "../../components/ui/PrimaryButton";
import InputField from "../../components/ui/InputField";
import { useAuth } from "../../lib/authContext";
import { handleRecoveryUrl } from "../../lib/authRecoveryHelper";
import { supabase } from "../../lib/supabaseClient";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const {
    resetPassword,
    verifyRecoveryOtp,
    verifyOtpAndResetPassword,
    updateUserPassword,
    logout,
    setIsPasswordRecovery,
    clearRecoveryState,
    setSession,
  } = useAuth();

  // Step 1: Email entry
  const [email, setEmail] = useState(params?.email || params?.prefillEmail || "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const isSubmittingRef = React.useRef(false);

  // In-app fallback state: Paste link or enter 6-digit OTP
  const [pastedLink, setPastedLink] = useState("");
  const [verifyingLink, setVerifyingLink] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendStatusMsg, setResendStatusMsg] = useState("");

  // Step 2: Password creation
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [isSuccessReset, setIsSuccessReset] = useState(false);

  useEffect(() => {
    if (params?.email || params?.prefillEmail) {
      setEmail(params.email || params.prefillEmail);
    }
  }, [params?.email, params?.prefillEmail]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "Reset Password — MaybeWe";
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Request recovery email via Supabase
  const handleResetPassword = async () => {
    if (isSubmittingRef.current || loading) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await resetPassword(trimmed);
      if (res.success) {
        setSubmittedEmail(trimmed);
        setIsSubmitted(true);
        setResendCooldown(60);
        setFailedAttempts(0);
      } else {
        const lowerErr = String(res.error || "").toLowerCase();
        if (
          lowerErr.includes("offline") ||
          lowerErr.includes("network") ||
          lowerErr.includes("failed to fetch") ||
          lowerErr.includes("timeout")
        ) {
          setErrorMessage("You're offline. Check your internet connection and try again.");
        } else if (
          lowerErr.includes("429") ||
          lowerErr.includes("rate") ||
          lowerErr.includes("too many") ||
          lowerErr.includes("security purposes")
        ) {
          setErrorMessage("Too many reset requests. Please wait a few minutes before trying again.");
        } else {
          setErrorMessage(res.error || "Failed to send reset email. Please try again.");
        }
      }
    } catch (err) {
      const lowerErr = String(err?.message || "").toLowerCase();
      if (
        lowerErr.includes("offline") ||
        lowerErr.includes("network") ||
        lowerErr.includes("failed to fetch")
      ) {
        setErrorMessage("You're offline. Check your internet connection and try again.");
      } else if (lowerErr.includes("429") || lowerErr.includes("rate") || lowerErr.includes("too many")) {
        setErrorMessage("Too many reset requests. Please wait a few minutes before trying again.");
      } else {
        setErrorMessage(err?.message || "Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Fallback 1: Verify Pasted Reset Link
  const handleVerifyLink = async () => {
    setOtpError("");
    const rawLink = pastedLink.trim();
    if (!rawLink) {
      setOtpError("Please paste the reset link from your recovery email.");
      return;
    }
    setVerifyingLink(true);
    console.log('[ForgotPassword:Diagnostic] stage=verifyLink_start linkLen=' + rawLink.length + ' hasEmail=' + Boolean(submittedEmail || email));
    const res = await handleRecoveryUrl({
      url: rawLink,
      email: submittedEmail || email,
      supabase,
      onSessionEstablished: (establishedSession) => {
        console.log('[ForgotPassword:Diagnostic] stage=onSessionEstablished');
        setIsSessionEstablished(true);
        if (typeof setSession === 'function' && establishedSession) setSession(establishedSession);
        if (setIsPasswordRecovery) setIsPasswordRecovery(true);
        setOtpError("");
        router.push("/(auth)/reset-password");
      },
      onError: (err, errCode) => {
        console.warn('[ForgotPassword:Diagnostic] stage=verifyLink_error code=' + errCode);
        setOtpError(err || "Invalid or expired reset link. Please request a new link.");
      },
    });
    setVerifyingLink(false);
    console.log('[ForgotPassword:Diagnostic] stage=verifyLink_end success=' + Boolean(res?.success) + ' handled=' + Boolean(res?.handled));
    if (res?.success) {
      setIsSessionEstablished(true);
      if (res?.session && typeof setSession === 'function') setSession(res.session);
      if (setIsPasswordRecovery) setIsPasswordRecovery(true);
      router.push("/(auth)/reset-password");
    } else if (res?.error) {
      setOtpError(res.error);
    }
  };

  // Fallback 2: Verify 6-digit recovery code
  const handleVerifyCodeOnly = async () => {
    setOtpError("");

    if (failedAttempts >= MAX_ATTEMPTS) {
      setOtpError("Maximum verification attempts reached. Please request a new recovery link.");
      return;
    }

    const code = otpCode.trim();
    if (!code) {
      setOtpError("Please enter the verification code or paste your reset link.");
      return;
    }

    setVerifyingCode(true);
    const res = await verifyRecoveryOtp(submittedEmail, code);
    setVerifyingCode(false);

    if (res.success && res.session) {
      setIsSessionEstablished(true);
      if (typeof setSession === 'function') setSession(res.session);
      if (setIsPasswordRecovery) setIsPasswordRecovery(true);
      setFailedAttempts(0);
      setOtpError("");
      router.push("/(auth)/reset-password");
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setOtpError("Maximum verification attempts reached. Please request a new recovery link.");
      } else {
        const remaining = MAX_ATTEMPTS - nextAttempts;
        const isExpired = res.error?.toLowerCase().includes("expired");
        if (isExpired) {
          setOtpError("This recovery link or code has expired. Please request a new link.");
        } else {
          const baseMsg = res.error || "Invalid verification code.";
          setOtpError(baseMsg + " (" + remaining + " attempt" + (remaining === 1 ? "" : "s") + " remaining)");
        }
      }
    }
  };

  // Resend recovery email
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatusMsg("");
    setOtpError("");
    const res = await resetPassword(submittedEmail);
    setIsResending(false);
    if (res.success) {
      setResendStatusMsg("A fresh reset link has been sent to your email.");
      setResendCooldown(60);
      setFailedAttempts(0);
      setOtpCode("");
      setPastedLink("");
    } else {
      if (
        res.error?.toLowerCase().includes("rate limit") ||
        res.error?.toLowerCase().includes("security purposes") ||
        res.error?.toLowerCase().includes("too many requests")
      ) {
        setResendStatusMsg("For security purposes, please wait a moment before requesting another link.");
        setResendCooldown(30);
      } else {
        setResendStatusMsg(res.error || "Failed to resend email. Please try again.");
      }
    }
  };

  // Step 2: Update password on active authenticated recovery session
  const handleUpdatePasswordOnly = async () => {
    setOtpError("");
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || trimmedNew.length < 6) {
      setOtpError("New password must be at least 6 characters long.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setOtpError("Passwords do not match. Please re-enter.");
      return;
    }

    setOtpLoading(true);
    const res = await updateUserPassword(trimmedNew);
    setOtpLoading(false);

    if (res.success) {
      setIsSuccessReset(true);
    } else {
      setOtpError(res.error || "Failed to update password. Please try again.");
    }
  };

  // Try again with a different email
  const handleTryAgain = () => {
    setIsSubmitted(false);
    setErrorMessage("");
    setOtpCode("");
    setPastedLink("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpError("");
    setIsSessionEstablished(false);
    setIsSuccessReset(false);
    setFailedAttempts(0);
    setResendStatusMsg("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar with Back Button & Brand Badge */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (setIsPasswordRecovery) setIsPasswordRecovery(false);
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(auth)/welcome");
              }
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <Ionicons name="airplane" size={14} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={styles.brandBadgeText}>MAYBEWE</Text>
          </View>

          <View style={{ width: 44 }} />
        </View>

        {/* Card Form or Success State */}
        <View style={styles.cardContainer}>
          {!isSubmitted ? (
            <>
              {/* Header Texts */}
              <View style={styles.headingSection}>
                <Text style={styles.headingTitle}>Reset Password</Text>
                <Text style={styles.headingSubtitle}>
                  Enter your registered email address to receive a password reset link or 6-digit recovery code.
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.glassFormCard}>
                <InputField
                  label="Email Address"
                  placeholder="name@example.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text.trimStart());
                    if (errorMessage) setErrorMessage("");
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  title="Send Reset Link"
                  accessibilityLabel="Send Recovery Code"
                  loading={loading}
                  onPress={handleResetPassword}
                  size="lg"
                  style={styles.actionCTA}
                />

                <View style={styles.signInPromptRow}>
                  <Text style={styles.signInPromptText}>Remember your password? </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (setIsPasswordRecovery) setIsPasswordRecovery(false);
                      router.push("/(auth)/login");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                  >
                    <Text style={styles.signInLinkText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : isSuccessReset ? (
            /* Final Success Card: Password Reset Complete */
            <View style={styles.glassFormCard}>
              <View style={styles.successIconWrapper}>
                <LinearGradient
                  colors={["rgba(52, 211, 153, 0.25)", "rgba(16, 185, 129, 0.10)"]}
                  style={styles.successIconBadge}
                >
                  <Ionicons name="shield-checkmark" size={36} color="#10B981" />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Password Updated!</Text>
              <Text style={styles.successMessage}>
                Your password has been reset successfully. You can now sign in with your new password.
              </Text>

              <PrimaryButton
                title="Sign In to MaybeWe"
                onPress={async () => {
                  try {
                    if (logout) await logout();
                  } catch {}
                  if (setIsPasswordRecovery) setIsPasswordRecovery(false);
                  router.replace({ pathname: "/(auth)/login", params: { email: submittedEmail || email } });
                }}
                size="lg"
                style={styles.actionCTA}
              />
            </View>
          ) : (
            /* Confirmation Card: Email Sent with Direct Link and Fallback Entry */
            <View style={styles.glassFormCard}>
              <View style={styles.successIconWrapper}>
                <LinearGradient
                  colors={["rgba(52, 211, 153, 0.25)", "rgba(16, 185, 129, 0.10)"]}
                  style={styles.successIconBadge}
                >
                  <Ionicons name="mail-unread-outline" size={36} color="#34D399" />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successMessage}>
                If an account exists for this email, you'll receive instructions to reset your password.
              </Text>
              <Text style={styles.successEmail}>{submittedEmail}</Text>
              <Text style={styles.successHint}>
                Tap the link in your email to open MaybeWe. If your browser stays blank, copy the reset link directly from your email without opening it in a browser, and paste it below.
              </Text>

              {/* In-App Direct Fallback Divider */}
              <View style={styles.otpDivider}>
                <View style={styles.otpDividerLine} />
                <Text style={styles.otpDividerText}>
                  {isSessionEstablished ? "SESSION VERIFIED" : "OR RESET WITH 6-DIGIT CODE"}
                </Text>
                <View style={styles.otpDividerLine} />
              </View>

              {!isSessionEstablished ? (
                <>
                  {/* Option A: Paste Reset Link */}
                  <InputField
                    label="Reset Link"
                    placeholder="Paste link from email (https://...)"
                    icon="link-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={pastedLink}
                    onChangeText={(text) => {
                      setPastedLink(text);
                      if (otpError) setOtpError("");
                    }}
                  />

                  <PrimaryButton
                    title="Verify Reset Link"
                    loading={verifyingLink}
                    onPress={handleVerifyLink}
                    variant="secondary"
                    size="md"
                    style={{ width: "100%", marginBottom: 16 }}
                  />

                  {/* Option B: 6-Digit Code */}
                  <InputField
                    label="Recovery Code"
                    placeholder="6-digit code (e.g. 123456)"
                    icon="key-outline"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text.replace(/[^0-9]/g, ""));
                      if (otpError) setOtpError("");
                    }}
                  />

                  {otpError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                      <Text style={styles.errorText}>{otpError}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    title="Verify Code"
                    loading={verifyingCode}
                    disabled={verifyingCode || failedAttempts >= MAX_ATTEMPTS}
                    onPress={handleVerifyCodeOnly}
                    size="lg"
                    style={styles.actionCTA}
                  />

                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={resendCooldown > 0 || isResending}
                    style={styles.resendCodeBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Resend recovery email"
                  >
                    <Text style={[styles.resendCodeText, resendCooldown > 0 && { color: "#94A3B8" }]}>
                      {isResending ? "Resending Email..." : resendCooldown > 0 ? "Resend in " + resendCooldown + "s" : "Resend Recovery Email"}
                    </Text>
                  </TouchableOpacity>

                  {resendStatusMsg ? (
                    <View style={styles.resendNoticeBox}>
                      <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                      <Text style={styles.resendNoticeText}>{resendStatusMsg}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                /* Gate: Password Update on Verified Recovery Session */
                <>
                  <View style={styles.sessionSuccessBadge}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.sessionSuccessText}>Code verified! Choose a new password:</Text>
                  </View>

                  <InputField
                    label="New Password"
                    placeholder="At least 6 characters"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (otpError) setOtpError("");
                    }}
                  />

                  <InputField
                    label="Confirm New Password"
                    placeholder="Re-enter new password"
                    icon="shield-checkmark-outline"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (otpError) setOtpError("");
                    }}
                  />

                  {otpError ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                      <Text style={styles.errorText}>{otpError}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    title="Update Password"
                    loading={otpLoading}
                    onPress={handleUpdatePasswordOnly}
                    size="lg"
                    style={styles.actionCTA}
                  />
                </>
              )}

              <PrimaryButton
                title="Back to Sign In"
                variant="secondary"
                onPress={() => {
                  if (setIsPasswordRecovery) setIsPasswordRecovery(false);
                  router.push("/(auth)/login");
                }}
                size="md"
                style={{ width: "100%", marginBottom: 12 }}
              />

              <TouchableOpacity
                onPress={handleTryAgain}
                style={styles.tryAgainButton}
                accessibilityRole="button"
                accessibilityLabel="Try a different email"
              >
                <Text style={styles.tryAgainText}>Didn't receive it? Try a different email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F6F2",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADII.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D8D3",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D8D3",
  },
  brandBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: "#171716",
    letterSpacing: 2.0,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 440,
    flex: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  headingSection: {
    marginBottom: 24,
  },
  headingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: "#171716",
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  headingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#363633",
  },
  glassFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADII.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: "#D9D8D3",
    ...SHADOWS.subtle,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
  },
  actionCTA: {
    marginTop: 8,
    marginBottom: 16,
  },
  signInPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  signInPromptText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#475569",
  },
  signInLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#0F172A",
    textDecorationLine: "underline",
  },
  successIconWrapper: {
    alignItems: "center",
    marginVertical: 12,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.35)",
    backgroundColor: "rgba(5, 150, 105, 0.10)",
  },
  successTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: "#0F172A",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  successMessage: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
  },
  successEmail: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#0F172A",
    textAlign: "center",
    marginVertical: 8,
  },
  successHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  otpDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    width: "100%",
  },
  otpDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  otpDividerText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: 1.0,
    marginHorizontal: 10,
  },
  sessionSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    marginBottom: 16,
    width: "100%",
  },
  sessionSuccessText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: "#047857",
    flex: 1,
  },
  resendCodeBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginBottom: 8,
  },
  resendCodeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#0F172A",
    textDecorationLine: "underline",
  },
  resendNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.20)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.sm,
    marginBottom: 12,
    width: "100%",
  },
  resendNoticeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#0369A1",
    flex: 1,
  },
  tryAgainButton: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  tryAgainText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#0F172A",
    textDecorationLine: "underline",
  },
});

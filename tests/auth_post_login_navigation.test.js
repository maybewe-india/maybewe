import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateAuthGuard } from "../frontend/lib/authGuard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

test("1. Cross-Table Verification Hydration Contract", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  // fetchSupabaseProfile must query user_verifications when users.verification_status is not verified
  assert.ok(
    authContextSrc.includes("from('user_verifications')") &&
    authContextSrc.includes("data.verification_status = 'verified'"),
    "fetchSupabaseProfile must check user_verifications and upgrade verification_status when verified"
  );

  // Must sync hasAgreedToGuidelines for verified users
  assert.ok(
    authContextSrc.includes("if (data.verification_status === 'verified')") &&
    authContextSrc.includes("setHasAgreedToGuidelines(true)"),
    "fetchSupabaseProfile must set hasAgreedToGuidelines(true) when verified"
  );
});

test("2. Login Handler Hydration Return Contract", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  // login() must return profile and hasAgreedToGuidelines
  assert.ok(
    authContextSrc.includes("profile: userProfile") &&
    authContextSrc.includes("hasAgreedToGuidelines: agreed"),
    "login() must return hydrated profile and hasAgreedToGuidelines state"
  );
});

test("3. checkVerificationStatus Null-Safety Contract", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  // Extract checkVerificationStatus function block
  const cvsStart = authContextSrc.indexOf("const checkVerificationStatus =");
  const cvsEnd = authContextSrc.indexOf("const setVerificationStatus =", cvsStart);
  const cvsBlock = authContextSrc.slice(cvsStart, cvsEnd);

  // Must not query session.user.id directly inside checkVerificationStatus fallback
  assert.ok(
    !cvsBlock.includes(".eq('user_id', session.user.id)"),
    "checkVerificationStatus must use safe userId fallback, not unprotected session.user.id"
  );
  assert.ok(
    cvsBlock.includes(".eq('user_id', userId)"),
    "checkVerificationStatus must filter user_verifications by userId"
  );
});

test("4. AuthRouteGuard Direct Routing for Authenticated Unverified Users Contract", () => {
  // Unverified user on login screen without guidelines agreed must be redirected to guidelines
  const decisionNoGuidelines = evaluateAuthGuard({
    hasSession: true,
    isLoading: false,
    isVerified: false,
    hasAgreedToGuidelines: false,
    segments: ["(auth)", "login"],
    isDevelopment: false,
  });
  assert.equal(decisionNoGuidelines, "redirect-to-guidelines");

  // Unverified user on login screen with guidelines agreed must be redirected to verification
  const decisionWithGuidelines = evaluateAuthGuard({
    hasSession: true,
    isLoading: false,
    isVerified: false,
    hasAgreedToGuidelines: true,
    segments: ["(auth)", "login"],
    isDevelopment: false,
  });
  assert.equal(decisionWithGuidelines, "redirect-to-verification");

  // Verified user on login screen must go directly to tabs
  const decisionVerified = evaluateAuthGuard({
    hasSession: true,
    isLoading: false,
    isVerified: true,
    hasAgreedToGuidelines: true,
    segments: ["(auth)", "login"],
    isDevelopment: false,
  });
  assert.equal(decisionVerified, "redirect-to-tabs");
});

test("5. Login Screen Direct Post-Login Destination Contract", () => {
  const loginSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/login.jsx"), "utf8");

  // login.jsx must check verification_status before choosing replacement route
  assert.ok(
    loginSrc.includes("const isVerified = res?.profile?.verification_status === 'verified';"),
    "login.jsx must inspect hydrated profile verification_status"
  );
  assert.ok(
    loginSrc.includes("router.replace('/(auth)/verification')") &&
    loginSrc.includes("router.replace('/(auth)/guidelines')"),
    "login.jsx must route unverified accounts directly to verification or guidelines"
  );
});

import { evaluateAuthGuard } from '../frontend/lib/authGuard.js';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const privacyPath = path.join(rootDir, "frontend", "app", "privacy.jsx");
const termsPath = path.join(rootDir, "frontend", "app", "terms.jsx");
const layoutPath = path.join(rootDir, "frontend", "app", "_layout.jsx");
const welcomePath = path.join(rootDir, "frontend", "app", "(auth)", "welcome.jsx");
const loginPath = path.join(rootDir, "frontend", "app", "(auth)", "login.jsx");
const signupPath = path.join(rootDir, "frontend", "app", "(auth)", "signup.jsx");
const settingsPath = path.join(rootDir, "frontend", "app", "settings.jsx");
const deleteAccountPath = path.join(rootDir, "frontend", "app", "delete-account.jsx");

test("1. Public Privacy Policy Route & Content Accuracy", () => {
  assert.ok(fs.existsSync(privacyPath), "frontend/app/privacy.jsx must exist");
  const content = fs.readFileSync(privacyPath, "utf8");

  assert.ok(content.includes("Privacy Policy"), "Must declare Privacy Policy title");
  assert.ok(content.includes("Foreground-Only GPS"), "Must detail foreground-only location access");
  assert.ok(content.includes("15-Minute Ephemeral TTL"), "Must specify 15m discovery presence TTL");
  assert.ok(content.includes("Zero Background Daemons"), "Must specify zero background tracking daemons");
  assert.ok(content.includes("OpenFreeMap"), "Must document OpenFreeMap / OSM open spatial queries");
  assert.ok(content.includes("24-Hour Ephemeral Stories"), "Must document 24h story expiration");
  assert.ok(content.includes("verification-documents"), "Must document isolated verification storage");
  assert.ok(content.includes("Emergency Contacts"), "Must document emergency contacts security");
  assert.ok(content.includes("/delete-account"), "Must link to /delete-account for self-service purge");
});

test("2. Public Terms of Service Route & Safety Invariants", () => {
  assert.ok(fs.existsSync(termsPath), "frontend/app/terms.jsx must exist");
  const content = fs.readFileSync(termsPath, "utf8");

  assert.ok(content.includes("Terms of Service"), "Must declare Terms of Service title");
  assert.ok(content.includes("18 years of age"), "Must specify 18+ eligibility requirement");
  assert.ok(content.includes("Authentic Identity"), "Must mandate authentic traveler profiles");
  assert.ok(content.includes("Zero-Tolerance User-Generated Content"), "Must enforce zero-tolerance UGC policy");
  assert.ok(content.includes("public.reports"), "Must cite in-app reporting queue");
  assert.ok(content.includes("Bidirectional Blocking"), "Must document mutual safety blocking");
  assert.ok(content.includes("Travel Safety Disclaimer"), "Must include solo travel safety disclaimer and assumption of risk");
  assert.ok(content.includes("/privacy"), "Must link to /privacy");
  assert.ok(content.includes("/delete-account"), "Must link to /delete-account");
});

test("3. Unauthenticated Public Access & Stack Route Registration", () => {
  assert.ok(fs.existsSync(layoutPath), "frontend/app/_layout.jsx must exist");
  const layout = fs.readFileSync(layoutPath, "utf8");

  assert.ok(layout.includes('name="privacy"'), "_layout.jsx Stack must register privacy screen");
  assert.ok(layout.includes('name="terms"'), "_layout.jsx Stack must register terms screen");
  assert.ok(layout.includes('name="delete-account"'), "_layout.jsx Stack must register delete-account screen");

  assert.ok(
    layout.includes("evaluateAuthGuard") || layout.includes("isPublicLegal"),
    "AuthRouteGuard must allow public unauthenticated access to /privacy, /terms, and /delete-account"
  );
  for (const legalRoute of ['privacy', 'terms', 'delete-account']) {
    assert.equal(
      evaluateAuthGuard({ hasSession: false, segments: [legalRoute], isDevelopment: false }),
      'allow',
      `AuthRouteGuard must allow public unauthenticated access to /${legalRoute}`
    );
  }
});

test("4. Integration Links Across Auth & In-App Navigation", () => {
  const welcome = fs.readFileSync(welcomePath, "utf8");
  assert.ok(welcome.includes('router.push("/terms")') || welcome.includes("'/terms'"), "welcome.jsx must link to /terms");
  assert.ok(welcome.includes('router.push("/privacy")') || welcome.includes("'/privacy'"), "welcome.jsx must link to /privacy");

  const login = fs.readFileSync(loginPath, "utf8");
  assert.ok(login.includes("'/terms'"), "login.jsx must link to /terms");
  assert.ok(login.includes("'/privacy'"), "login.jsx must link to /privacy");

  const signup = fs.readFileSync(signupPath, "utf8");
  assert.ok(signup.includes("'/terms'"), "signup.jsx must link to /terms");
  assert.ok(signup.includes("'/privacy'"), "signup.jsx must link to /privacy");

  const settings = fs.readFileSync(settingsPath, "utf8");
  assert.ok(settings.includes('router.push("/privacy")'), "settings.jsx must link to /privacy");
  assert.ok(settings.includes('router.push("/terms")'), "settings.jsx must link to /terms");
  assert.ok(settings.includes('router.push("/delete-account")'), "settings.jsx must link to /delete-account");
});

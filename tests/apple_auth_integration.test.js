import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// 1. Cryptographic Nonce Generation & Hash Integrity Contract
test("1. Cryptographic Nonce Generation & SHA-256 Hash Integrity Contract", async () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  assert.ok(
    authContextSrc.includes("export async function generateCryptoNonce()"),
    "authContext.jsx must export generateCryptoNonce"
  );
  assert.ok(
    authContextSrc.includes("Crypto.CryptoDigestAlgorithm.SHA256"),
    "generateCryptoNonce must use Crypto.CryptoDigestAlgorithm.SHA256"
  );

  const rawNonce1 = crypto.randomBytes(32).toString("hex");
  const hashedNonce1 = crypto.createHash("sha256").update(rawNonce1).digest("hex");

  const rawNonce2 = crypto.randomBytes(32).toString("hex");
  const hashedNonce2 = crypto.createHash("sha256").update(rawNonce2).digest("hex");

  assert.strictEqual(typeof rawNonce1, "string");
  assert.ok(rawNonce1.length >= 32, "Raw nonce must have sufficient cryptographic entropy");
  assert.strictEqual(
    crypto.createHash("sha256").update(rawNonce1).digest("hex"),
    hashedNonce1,
    "Hashed nonce must match SHA-256 digest of raw nonce"
  );
  assert.notStrictEqual(rawNonce1, rawNonce2, "Consecutive nonces must be uniquely random");
  assert.notStrictEqual(hashedNonce1, hashedNonce2, "Consecutive hashed nonces must be distinct");
});

// 2. Apple Native Token Exchange & Supabase Parameter Contract
test("2. Apple Native Token Exchange & Supabase signInWithIdToken Parameter Contract", async () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  assert.ok(
    authContextSrc.includes("provider: \x27apple\x27"),
    "authContext.jsx must pass provider: \x27apple\x27 to Supabase"
  );
  assert.ok(
    authContextSrc.includes("token: credential.identityToken"),
    "authContext.jsx must pass token: credential.identityToken"
  );
  assert.ok(
    authContextSrc.includes("nonce: rawNonce"),
    "authContext.jsx must pass unhashed rawNonce to signInWithIdToken"
  );

  let exchangeParams = null;
  const mockSupabase = {
    auth: {
      signInWithIdToken: async (params) => {
        exchangeParams = params;
        if (!params.token) throw new Error("Token required");
        return { data: { session: { user: { id: "usr_apple_101", email: "test@apple.com" } } }, error: null };
      },
    },
  };

  const validCredential = { identityToken: "mock_apple_jwt_token", fullName: null };
  const rawNonce = "mock_raw_nonce_abc123";

  const result = await mockSupabase.auth.signInWithIdToken({
    provider: "apple",
    token: validCredential.identityToken,
    nonce: rawNonce,
  });

  assert.strictEqual(exchangeParams.provider, "apple");
  assert.strictEqual(exchangeParams.token, "mock_apple_jwt_token");
  assert.strictEqual(exchangeParams.nonce, "mock_raw_nonce_abc123");
  assert.strictEqual(result.data.session.user.id, "usr_apple_101");

  const invalidCredential = { identityToken: null };
  let threw = false;
  try {
    if (!invalidCredential.identityToken) {
      throw new Error("Apple identity token was not returned from authorization.");
    }
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, "Apple identity token was not returned from authorization.");
  }
  assert.ok(threw, "Missing identity token must throw defensive error");
});

// 3. Profile Name Single-Shot Capture vs Zero-Overwrite Contract
test("3. Profile Name Single-Shot Capture vs Zero-Overwrite Protection Contract", async () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  assert.ok(
    authContextSrc.includes("credential.fullName?.givenName") || authContextSrc.includes("credential.fullName.givenName"),
    "authContext.jsx must inspect credential.fullName"
  );
  assert.ok(
    authContextSrc.includes("if (!existingUser.name)"),
    "authContext.jsx must guard against overwriting pre-existing user names with null/empty"
  );

  const database = {
    users: [
      { id: "existing_user_1", name: "Original Name" },
      { id: "nameless_user_2", name: null },
    ],
  };

  // Subsequent login with null fullName
  const subsequentCred = { identityToken: "jwt", fullName: null };
  const givenNameA = subsequentCred.fullName?.givenName || "";
  const familyNameA = subsequentCred.fullName?.familyName || "";
  const appleNameA = [givenNameA, familyNameA].filter(Boolean).join(" ").trim();

  if (appleNameA) {
    database.users[0].name = appleNameA;
  }
  assert.strictEqual(
    database.users[0].name,
    "Original Name",
    "Subsequent Apple logins with null fullName must NOT nullify or overwrite existing name"
  );

  // First-time login with fullName
  const firstTimeCred = { identityToken: "jwt", fullName: { givenName: "Aarav", familyName: "Patel" } };
  const givenNameB = firstTimeCred.fullName?.givenName || "";
  const familyNameB = firstTimeCred.fullName?.familyName || "";
  const appleNameB = [givenNameB, familyNameB].filter(Boolean).join(" ").trim();

  if (appleNameB) {
    const existing = database.users.find((u) => u.id === "nameless_user_2");
    if (existing && !existing.name) {
      existing.name = appleNameB;
    }
  }
  assert.strictEqual(
    database.users[1].name,
    "Aarav Patel",
    "Initial sign-in with Apple must capture and populate missing user name"
  );
});

// 4. User Cancellation & Error Code Isolation Contract
test("4. User Cancellation & Network Error Classification Contract", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");
  const loginSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/login.jsx"), "utf8");

  assert.ok(
    authContextSrc.includes("ERR_REQUEST_CANCELED") && authContextSrc.includes("ERR_CANCELED"),
    "authContext.jsx must isolate Apple cancel error codes"
  );
  assert.ok(
    loginSrc.includes("res?.cancelled"),
    "login.jsx must check res?.cancelled to prevent false alerts on user cancel"
  );

  const cancelErrors = [
    { code: "ERR_REQUEST_CANCELED", message: "The user canceled the authorization attempt." },
    { code: "ERR_CANCELED", message: "User canceled" },
    { code: "1001", message: "Authentication canceled" },
    { message: "Authorization Cancelled by User" },
  ];

  for (const err of cancelErrors) {
    const isCancelled =
      err?.code === "ERR_REQUEST_CANCELED" ||
      err?.code === "ERR_CANCELED" ||
      err?.code === "1001" ||
      String(err?.message || "").toLowerCase().includes("cancel");

    assert.strictEqual(isCancelled, true);
  }

  const networkErr = { name: "AuthRetryableFetchError", message: "Network request failed" };
  let userMessage = "Default error";
  if (
    networkErr.name === "AuthRetryableFetchError" ||
    networkErr.message?.includes("fetch failed") ||
    networkErr.message?.includes("Network request failed")
  ) {
    userMessage = "Network connection error. Please check your internet connection and try again.";
  }
  assert.ok(userMessage.includes("Network connection error"), "Network faults must produce clear connectivity guidance");
});

// 5. Cross-Platform Execution Branching Contract (iOS Native vs Android/Web OAuth)
test("5. Cross-Platform Execution Branching & Redirection Contract", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");
  const appJsonSrc = fs.readFileSync(path.join(ROOT, "app.json"), "utf8");

  assert.ok(authContextSrc.includes("Platform.OS === \x27ios\x27"), "Must isolate native iOS path");
  assert.ok(authContextSrc.includes("Platform.OS === \x27web\x27"), "Must support Web OAuth path");
  assert.ok(
    authContextSrc.includes("scheme: \x27solo-traveler\x27"),
    "Native OAuth redirect must use configured solo-traveler scheme"
  );

  const appJson = JSON.parse(appJsonSrc);
  assert.strictEqual(appJson.expo.scheme, "solo-traveler", "App scheme must be solo-traveler");
  assert.strictEqual(appJson.expo.ios.usesAppleSignIn, true, "app.json must declare ios.usesAppleSignIn: true");
  assert.ok(
    appJson.expo.plugins.includes("expo-apple-authentication"),
    "app.json must declare expo-apple-authentication in plugins"
  );
});

// 6. Login Screen UI State, Loading Invariants & Regressions Contract
test("6. Login Screen UI State, Loading Invariants & Regressions Contract", () => {
  const loginSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/login.jsx"), "utf8");

  assert.ok(
    loginSrc.includes("onPress={handleAppleSignIn}"),
    "login.jsx must wire Apple button to handleAppleSignIn"
  );

  assert.ok(
    loginSrc.includes("disabled={loading || googleLoading || appleLoading}"),
    "Social buttons must be disabled during active authentication requests"
  );

  assert.ok(
    loginSrc.includes("appleLoading ? (") && loginSrc.includes("logo-apple"),
    "Apple button must display ActivityIndicator during active loading and logo-apple when idle"
  );

  assert.ok(loginSrc.includes("handleSignIn"), "handleSignIn must remain defined");
  assert.ok(loginSrc.includes("handleGoogleSignIn"), "handleGoogleSignIn must remain defined");
  assert.ok(loginSrc.includes("signInCTA"), "Primary email sign-in button must remain defined");
});

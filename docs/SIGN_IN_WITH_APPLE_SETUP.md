# MaybeWe — Sign in with Apple Setup & Configuration Guide

This guide documents the exact configuration steps required to connect **MaybeWe** with Apple Developer and Supabase Auth.

---

## Architecture Overview

| Platform | Authentication Mechanism | Client Identifier | Callback / Nonce Routing |
| :--- | :--- | :--- | :--- |
| **iOS Native** | Native biometric sheet via `expo-apple-authentication` | Primary App ID: `com.maybewe.app` | Client-generated SHA-256 raw nonce exchanged via `supabase.auth.signInWithIdToken` |
| **Android** | In-app secure browser OAuth via `expo-web-browser` | Services ID: `com.maybewe.app.service` | Redirect to `solo-traveler://auth/callback` |
| **Web** | Direct browser OAuth redirection | Services ID: `com.maybewe.app.service` | Redirect to `https://<app-domain>` / local origin |

---

## Part A: Apple Developer Portal (`developer.apple.com`)

### 1. Primary App ID Configuration (iOS Native)
* **Status:** `NEEDS USER ACTION`
1. Sign in to [Apple Developer Account](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers** → **App IDs**.
3. Locate and click on the Primary App ID: **`com.maybewe.app`**.
4. In the **Capabilities** list, check the box for **Sign in with Apple**.
5. Click **Edit** next to Sign in with Apple and ensure **Enable as a primary App ID** is selected.
6. Click **Save** and confirm the capability update.

### 2. Services ID Configuration (Android & Web OAuth)
* **Status:** `NEEDS USER ACTION`
1. Under **Identifiers**, click the **+** (Add) button and select **Services IDs**, then click **Continue**.
2. Set Description: `MaybeWe Web and Android Auth`.
3. Set Identifier: **`com.maybewe.app.service`**.
4. Click **Continue** and **Register**.
5. Click on the newly registered Services ID (`com.maybewe.app.service`).
6. Check **Sign in with Apple**, then click **Configure**.
7. Set **Primary App ID**: Select `com.maybewe.app`.
8. Under **Domains and Subdomains**, add:
   ```
   vdmzchvwrmqnbmpzvgng.supabase.co
   ```
9. Under **Return URLs**, add the exact Supabase authentication callback endpoint:
   ```
   https://vdmzchvwrmqnbmpzvgng.supabase.co/auth/v1/callback
   ```
10. Click **Done** and then click **Save**.

### 3. Sign in with Apple Private Key Generation
* **Status:** `NEEDS USER ACTION`
1. Navigate to **Keys** → click **+** (Register a New Key).
2. Set Key Name: `MaybeWe Supabase Sign In with Apple Key`.
3. Check **Sign in with Apple** and click **Configure**.
4. Select Primary App ID: **`com.maybewe.app`**.
5. Click **Save**, then click **Continue**, and **Register**.
6. **Download the Key File (`.p8`):**
   > **CRITICAL WARNING:** Apple allows downloading the private key file (`.p8`) **only once**. Save this file in a secure credential manager or vault immediately. Never commit it to git or paste it into public chats.
7. Record the **Key ID** (10 characters, displayed next to key name).
8. Record your **Apple Team ID** (10 characters, visible in the top-right corner of your Apple Developer portal next to your organization/developer name).

---

## Part B: Supabase Console Configuration (`supabase.com`)

### 1. Enable the Apple Provider
* **Status:** `NEEDS USER ACTION`
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/vdmzchvwrmqnbmpzvgng).
2. Navigate to **Authentication** → **Providers** → select **Apple**.
3. Toggle **Enable Sign in with Apple** to **ON**.

### 2. Enter Apple Credentials
* **Status:** `NEEDS USER ACTION`
1. **Authorized Client IDs (comma-separated):**
   ```
   com.maybewe.app, com.maybewe.app.service
   ```
   *(The first ID authorizes native iOS identity tokens; the second authorizes web and Android OAuth callback codes).* 
2. **Apple Team ID:** Enter your 10-character Apple Team ID.
3. **Apple Key ID:** Enter your 10-character Key ID from Step A3.
4. **Apple Secret Key:** Open the downloaded `.p8` file in a secure text editor and paste the full text, including:
   ```
   -----BEGIN PRIVATE KEY-----
   ... your private key lines ...
   -----END PRIVATE KEY-----
   ```
5. Click **Save**.

### 3. Verify Supabase Redirect URLs
* **Status:** `NEEDS USER ACTION`
1. In the Supabase Dashboard, navigate to **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, confirm that the mobile app custom scheme callback is registered:
   ```
   solo-traveler://auth/callback
   ```
   *(Ensure `http://localhost:8081` is also present if web development is active).* 

---

## Part C: EAS & iOS Signing Entitlements

* **Status:** `NEEDS USER ACTION`
1. The project configuration in `app.json` has already been updated with:
   ```json
   "ios": {
     "bundleIdentifier": "com.maybewe.app",
     "usesAppleSignIn": true
   },
   "plugins": [
     "expo-apple-authentication"
   ]
   ```
2. When creating your next build with EAS (`eas build -p ios`), run `eas credentials` to let EAS generate or synchronize provisioning profiles containing the `com.apple.developer.applesignin` capability.
3. If building locally via Xcode: Open `ios/solo-traveler-app.xcworkspace` (after prebuild), open **Signing & Capabilities**, click **+ Capability**, and add **Sign in with Apple**.

---

## Part D: External Configuration Status Matrix

| Component | Setting / Asset | Required State | Current Status |
| :--- | :--- | :--- | :--- |
| **Local Codebase** | `expo-apple-authentication` installed | `~57.0.2` in `package.json` | **VERIFIED** |
| **Local Codebase** | `expo-crypto` installed | `~57.0.4` in `package.json` | **VERIFIED** |
| **Local Codebase** | `usesAppleSignIn: true` in `app.json` | Configured under `expo.ios` | **VERIFIED** |
| **Local Codebase** | Native Nonce + `signInWithIdToken` | Implemented in `authContext.jsx` | **VERIFIED** |
| **Local Codebase** | Android/Web OAuth Fallback | Implemented in `authContext.jsx` | **VERIFIED** |
| **Local Codebase** | Button Wiring + Loading State | Implemented in `login.jsx` | **VERIFIED** |
| **Local Codebase** | Name Capture & Zero Overwrite | Implemented in `authContext.jsx` | **VERIFIED** |
| **Local Codebase** | Automated Unit/Integration Tests | Passing in `apple_auth_integration.test.js` | **VERIFIED** |
| **Apple Developer** | App ID `com.maybewe.app` Capability | Sign in with Apple enabled | **NEEDS USER ACTION** |
| **Apple Developer** | Services ID `com.maybewe.app.service` | Return URL registered | **NEEDS USER ACTION** |
| **Apple Developer** | Sign in with Apple Key (`.p8`) | Generated & downloaded | **NEEDS USER ACTION** |
| **Supabase Console** | Apple Provider Activated | Enabled with Key, IDs & Secret | **NEEDS USER ACTION** |
| **Supabase Console** | Redirect URL `solo-traveler://auth/callback` | Present in URL Configuration | **NEEDS USER ACTION** |
| **EAS / Xcode** | Provisioning Profile Capability | `com.apple.developer.applesignin` synced | **NEEDS USER ACTION** |
| **Physical Hardware** | Real Apple ID Biometric Verification | Physical iOS device test pass | **NOT VERIFIED** |

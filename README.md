# MLBB Skin Collage App

A production-grade mobile app and administrative system for Mobile Legends: Bang Bang players. Users upload screenshots of their in-game skin collection; the app recognizes card text using on-device ML Kit OCR, fuzzy matches each card against the skin database, and generates an ultra-sharp, high-resolution collage image grouped and sorted by skin tier using offscreen Skia rendering.

Access is controlled via time-limited, device-bound subscription product keys managed through a secure React admin dashboard.

---

## 1. System Architecture

```
mlbb-collage/
├── app/            # React Native (Expo SDK 52, TypeScript, expo-router, Skia, ML Kit)
├── admin/          # Web Admin Dashboard (Vite, React 18, TypeScript, Tailwind CSS)
├── functions/      # Cloud Functions v2 (Node 20, TypeScript, callable, App Check enforced)
├── data-tools/     # Skin catalog processing and Firebase admin scripts
│   ├── build-skins.mjs       # Scans tier folders and generates skins.json + WebP icons
│   ├── upload-data.mjs      # Uploads skins.json and icons to Firebase Storage
│   └── set-admin-claim.mjs   # Grants admin: true custom claims to Firebase user
├── icons/          # Source skin icon assets organized by tier (4000, 3000, 2000, etc.)
├── samples/        # Sample collection screenshots for calibrating OCR
├── firestore.rules # Firestore security rules (denies all direct client access)
├── storage.rules   # Firebase Storage security rules
└── firebase.json   # Multi-service Firebase configuration and emulator ports
```

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher
- **Firebase CLI**: Install globally:
  ```bash
  npm install -g firebase-tools
  ```
- **Java JDK**: `v17+` (required for running Firebase Firestore and Storage emulators)
- **EAS CLI** (for mobile builds):
  ```bash
  npm install -g eas-cli
  ```

---

## 3. Step-by-Step Setup Guide

### Step 3.1: Firebase Project Setup
1. Log in to Firebase:
   ```bash
   firebase login
   ```
2. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/) (e.g. `mlbb-skin-collage`).
3. **Upgrade to Blaze Plan** (Pay-as-you-go). This is required for Cloud Functions v2 and external network egress.
4. Set the project in your CLI:
   ```bash
   firebase use <YOUR_PROJECT_ID>
   ```

### Step 3.2: Enable Firebase Services
In the Firebase Console, enable:
- **Authentication**: Enable **Anonymous** and **Email/Password** sign-in providers.
- **Cloud Firestore**: Create database in `asia-south1` (or your preferred region) in production mode.
- **Cloud Storage**: Create default storage bucket.
- **Firebase Hosting**: For hosting the Admin Web dashboard.
- **App Check**: Enabled with Play Integrity for Android, and reCAPTCHA v3 or Debug Provider for web and development.

### Step 3.3: Enable Google Cloud APIs
In the [Google Cloud Console](https://console.cloud.google.com/) for your project, ensure the following APIs are enabled:
```bash
gcloud services enable \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  identitytoolkit.googleapis.com \
  firebaseappcheck.googleapis.com \
  playintegrity.googleapis.com
```

### Step 3.4: Register Clients in Firebase Console
1. **Android App**:
   - Register Android package: `com.mlbbcollage.app`
   - Download `google-services.json` and place it in `app/google-services.json`.
   - Add your SHA-256 fingerprint for App Check and Play Integrity.
2. **Web App (Admin Dashboard)**:
   - Register a Web app (e.g., `MLBB Admin`).
   - Copy configuration keys and populate `admin/.env`:
     ```env
     VITE_FIREBASE_API_KEY=AIzaSy...
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
     VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
     VITE_FIREBASE_REGION=asia-south1
     VITE_USE_EMULATORS=false
     ```

### Step 3.5: Create First Admin Account
1. In Firebase Console -> Authentication -> Users, click **Add user** (e.g., `admin@mlbbcollage.com`).
2. Generate service account credentials in **Project Settings -> Service accounts -> Generate new private key**, and save as `service-account.json`.
3. Set your Google Cloud credential environment variable:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\service-account.json"
   # macOS / Linux
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
   ```
4. Run the admin claim script:
   ```bash
   node data-tools/set-admin-claim.mjs admin@mlbbcollage.com
   ```

---

## 4. Skin Data Pipeline

1. Place source icons in `icons/<tier>/` where tier folders are:
   - `icons/4000/`
   - `icons/3000/`
   - `icons/2000/`
   - `icons/500/` (optional)
   - `icons/400/`
   - `icons/200/`
   - `icons/100/`
   File format: `Hero__Skin_Name.png` (double underscore between hero and skin name).

2. Build skin catalog and normalized WebP icons:
   ```bash
   node data-tools/build-skins.mjs
   ```
   *Optionally pass `--size 512` for higher resolution icons.*

3. Upload catalog and icons to Firebase Storage:
   ```bash
   node data-tools/upload-data.mjs
   ```

---

## 5. Local Development & Emulator Suite

The repository includes complete emulator configurations for Auth, Firestore, Functions, Storage, and Hosting:

1. Start all Firebase emulators:
   ```bash
   firebase emulators:start
   ```
   - Emulator UI: `http://localhost:4000`
   - Firestore: `localhost:8080`
   - Auth: `localhost:9099`
   - Functions: `localhost:5001`
   - Storage: `localhost:9199`
   - Hosting: `localhost:5000`

2. Run Functions Tests with Emulator:
   ```bash
   firebase emulators:exec "cd functions && npm test"
   ```

3. Run Admin Dashboard locally:
   ```bash
   cd admin
   npm install
   npm run dev
   ```

4. Run Mobile App locally:
   ```bash
   cd app
   npm install --legacy-peer-deps
   npx expo start
   ```

---

## 6. Deployment

1. Build Admin Web page:
   ```bash
   cd admin
   npm run build
   cd ..
   ```
2. Build Cloud Functions:
   ```bash
   cd functions
   npm run build
   cd ..
   ```
3. Deploy all services to Firebase:
   ```bash
   firebase deploy
   ```

---

## 7. EAS Mobile Development Build

Expo Go does not include native modules like `@shopify/react-native-skia` and `@react-native-ml-kit/text-recognition`. You must create an EAS development build:

1. Configure EAS:
   ```bash
   cd app
   eas login
   eas build:configure
   ```
2. Build Android development APK:
   ```bash
   eas build --profile development --platform android
   ```
3. Install the generated `.apk` on your test device.
4. Start development server:
   ```bash
   npx expo start --dev-client
   ```

---

## 8. Manual QA Checklist (Real Device Testing)

Execute this complete validation on a physical Android phone before production release:

- [ ] **1. Fresh Launch & Splash**:
  - App opens with logo, status spinner, and loads catalog manifest cleanly.
  - Generates a UUID `deviceId` in secure store.
- [ ] **2. Unauthenticated Home Screen**:
  - Generate Collage button is dimmed with prompt "Enter a product key to continue" when tapped.
  - Status indicator displays "No active key".
  - Logout button is hidden.
- [ ] **3. Brute Force Lockout**:
  - Enter 5 consecutive random incorrect keys.
  - Verify error message indicates lockout for 15 minutes.
- [ ] **4. Key Activation**:
  - Enter a valid 7-day key from Admin panel.
  - Key input converts to masked format (`ABCD-    -    -QRST`).
  - Status updates to "7 days 0 hours left" with green status dot.
  - Generate Collage button activates.
- [ ] **5. Clock Manipulation Prevention**:
  - Advance the device clock ahead by 2 days in Android settings.
  - Reopen app. Verify remaining time remains accurate based on server offset.
- [ ] **6. Single-Device Enforcement**:
  - Attempt to activate the same key on a second device.
  - Second device receives error: "This key is in use on another device. Log out there first, or contact support."
- [ ] **7. Logout & Timer Continuity**:
  - Tap Logout on Device 1. Confirmation modal warns: "Your remaining time keeps running while you are logged out."
  - Confirm logout. Device 1 returns to "No active key".
  - Activate key on Device 2. Activation succeeds with remaining time intact.
- [ ] **8. Screenshot Selection**:
  - Tap Generate Collage.
  - Select up to 30 collection screenshots from gallery.
  - Delete a thumbnail from selection grid using the "✕" button.
- [ ] **9. Scanning & OCR Recognition**:
  - Tap Scan.
  - Progress indicator updates in real time ("Reading image X of Y").
  - Running counter displays recognized skins accurately.
- [ ] **10. Review Screen & Needs Attention**:
  - Review screen displays matched skins grouped by point tier (4000, 3000, 2000, etc.).
  - Top "Needs attention" section displays any uncertain cards with top 3 suggestions.
  - Tap "Change" on a skin to open search modal and select alternative.
  - Tap "+ Add Skin" to manually add any skin from catalog.
- [ ] **11. Customization Options**:
  - Enter optional in-game Username and Server.
  - Toggle total skin count and tier counts.
  - Test column variations (12, 16, 20 columns) and theme toggle (dark/light).
- [ ] **12. Collage Generation & Export**:
  - Generate collage.
  - Verify offscreen Skia rendering displays sharp, rounded tier-bordered icons without pixelation.
  - If skin collection exceeds 8192px height, verify automatic page splitting into Page 1, Page 2.
  - Tap "Save to Gallery". Verify image is present in phone Photos app.
  - Tap "Share as File" and verify Android share sheet opens.
- [ ] **13. Offline Icon Download**:
  - Navigate to Settings -> Download All Icons.
  - Progress bar downloads and caches all catalog icons locally.
  - Turn on Airplane Mode. Generate a collage to confirm complete offline operation.
- [ ] **14. Legal Compliance**:
  - Confirm footer and Settings screen display the disclaimer:
    *"Not affiliated with or endorsed by Moonton."*

---

## 9. License & Legal Disclaimer

This is an unofficial, community-made fan application and is not affiliated with, endorsed, sponsored, or specifically approved by Moonton. Mobile Legends: Bang Bang and its respective logos and artwork are trademarks of Shanghai Moonton Technology Co., Ltd.

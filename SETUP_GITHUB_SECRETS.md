# GitHub Secrets Setup — SBH
## Add these secrets to your GitHub repo: Settings → Secrets → Actions

### GCP Secrets
| Secret Name | Value |
|---|---|
| `GCP_PROJECT_ID` | `science-based-health` |
| `GCP_SA_KEY` | _(contents of `.secrets/gcp-sa-key.json` — the full JSON)_ |

### Firebase Secrets (same as .env.local)
| Secret Name | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | _(from Firebase Console → Project Settings → Your apps → SDK config)_ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `science-based-health.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `science-based-health` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `science-based-health.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | _(from Firebase Console → Project Settings)_ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | _(from Firebase Console → Project Settings)_ |

### Steps
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret" for each row above
3. For GCP_SA_KEY: open `.secrets/gcp-sa-key.json`, copy the ENTIRE file contents
4. Push to `main` branch → GitHub Actions auto-deploys to Cloud Run

### Delete after use (security)
Once secrets are added to GitHub, you can delete the local key:
```
del .secrets\gcp-sa-key.json
```

---

## Android Keystore Setup (for Google Play)

### Step 1 — Generate keystore (run once in Command Prompt, not PowerShell)
```
keytool -genkeypair -v -keystore %USERPROFILE%\sbh-release.keystore -alias sbh -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=SBH App, OU=SBH, O=SBH, L=London, ST=England, C=GB"
```
You will be prompted to set a password — remember it. File saved to `C:\Users\pavan\sbh-release.keystore`.
**Back this file up immediately (Google Drive, USB, etc) — losing it = can never update the app.**

### Step 2 — Base64-encode the keystore (still in Command Prompt)
```
certutil -encode %USERPROFILE%\sbh-release.keystore %USERPROFILE%\sbh-keystore-b64.txt && type %USERPROFILE%\sbh-keystore-b64.txt
```
Copy everything BETWEEN (not including) the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

### Step 3 — Add 4 secrets to GitHub
Go to: https://github.com/kampav/SBH/settings/secrets/actions → "New repository secret"

| Secret Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | long string from Step 2 |
| `ANDROID_STORE_PASSWORD` | password chosen in Step 1 |
| `ANDROID_KEY_PASSWORD` | same password |
| `ANDROID_KEY_ALIAS` | `sbh` |

### Step 4 — Firebase Auth: add localhost domain
Firebase Console → Authentication → Settings → Authorized domains → Add `localhost`

### Step 5 — Trigger the build
GitHub → Actions → "Build Android AAB" → "Run workflow"
Wait ~5 min → download artifact `sbh-release-1.aab`

### Step 6 — Google Play
- Sign up at https://play.google.com/console ($25 one-time)
- Create app → Testing → Internal testing → upload the .aab file

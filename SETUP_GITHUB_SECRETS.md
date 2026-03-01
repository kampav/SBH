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
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyA-tGz4ivs8ulpyLIKfXoyPyLuZau92hVE` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `science-based-health.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `science-based-health` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `science-based-health.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `399365807066` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:399365807066:web:ce95b6be7d62d90d30fee3` |

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

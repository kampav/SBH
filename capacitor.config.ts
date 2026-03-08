import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sciencebasedhealth.sbh',
  appName: 'HealthOS',
  // webDir is required by @capacitor/assets for icon generation.
  // The app does NOT serve local assets — it loads the live URL below.
  webDir: 'public',
  server: {
    url: 'https://sbh-app-m3nvdpbv4q-nw.a.run.app',
    cleartext: false,         // HTTPS only — enforced at OS level too
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,  // No splash screen — app loads immediately
    },
  },
}

export default config

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartlean.nexusinbound',
  appName: 'CIAL Inbound',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

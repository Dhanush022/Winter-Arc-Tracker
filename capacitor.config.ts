import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.winterarc.tracker',
  appName: 'Winter Arc',
  webDir: 'out',
  server: {
    url: 'https://winter-arcc.vercel.app/',
    cleartext: false,
  },
};

export default config;

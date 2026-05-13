import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

const config: CapacitorConfig = {
  appId: "kr.silsigan.app",
  appName: "#실시간",
  webDir: "public/capacitor",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
  ios: {
    contentInset: "always",
  },
};

export default config;

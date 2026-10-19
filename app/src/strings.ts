/**
 * All user-facing text in a single file for easy translation.
 */
export const strings = {
  appName: "MLBB Skin Collage",

  // Home screen
  home: {
    generateCollage: "Generate Collage",
    enterKey: "Enter product key",
    activate: "Activate",
    logout: "Logout",
    noActiveKey: "No active key",
    keyExpired: "Key expired",
    expired: "Expired",
    logoutConfirmTitle: "Logout",
    logoutConfirmMessage:
      "Your remaining time keeps running while you are logged out.",
    logoutConfirmCancel: "Cancel",
    logoutConfirmOk: "Logout",
    keyHint: "Enter a product key to continue",
  },

  // Time formatting
  time: {
    daysHours: (d: number, h: number) => `${d} day${d !== 1 ? "s" : ""} ${h} hour${h !== 1 ? "s" : ""} left`,
    hoursMin: (h: number, m: number) => `${h} hour${h !== 1 ? "s" : ""} ${m} min left`,
    minLeft: (m: number) => `${m} min left`,
  },

  // Upload/Scan
  upload: {
    title: "Upload Screenshots",
    instructions:
      "Open Collection, then Skins, choose the Owned filter, scroll and take a screenshot of each page.",
    scan: "Scan",
    scanning: "Reading image",
    scanProgress: (current: number, total: number) => `Reading image ${current} of ${total}`,
    recognized: (count: number) => `${count} skins recognized`,
    maxImages: "Maximum 30 screenshots allowed",
    remove: "Remove",
  },

  // Review
  review: {
    title: "Review Matches",
    needsAttention: "Needs attention",
    matched: (count: number) => `Matched ${count}`,
    change: "Change",
    removeEntry: "Remove",
    addSkin: "Add skin",
    searchPlaceholder: "Search hero or skin name...",
    continue: "Continue",
    couldNotRead: "Could not read this image",
  },

  // Customize
  customize: {
    title: "Customize Collage",
    username: "Username (optional)",
    server: "Server (optional)",
    showTotalCount: "Show total count",
    showTotal: "Show total count",
    showTierCounts: "Show tier counts",
    showTiers: "Show tier counts",
    columns: "Columns",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    generate: "Generate Collage",
  },

  // Result
  result: {
    title: "Your Collage",
    save: "Save to Gallery",
    saveGallery: "Save to Gallery",
    share: "Share as File",
    regenerate: "Regenerate",
    shareNote:
      "Use Share as file to avoid WhatsApp compressing the image.",
    saved: "Saved to gallery!",
    page: (current: number, total: number) => `Page ${current} of ${total}`,
  },

  // Settings / About
  settings: {
    title: "Settings",
    downloadAllIcons: "Download All Icons",
    downloadProgress: (pct: number) => `Downloading... ${pct}%`,
    about: "About",
    disclaimer:
      "This app is a fan-made tool and is not affiliated with or endorsed by Moonton.",
  },

  // Errors
  errors: {
    KEY_REVOKED: "This key has been revoked. Contact support.",
    KEY_EXPIRED: "This key has expired.",
    KEY_IN_USE:
      "This key is in use on another device. Log out there first, or contact support.",
    NOT_FOUND: "Key not found. Please check and try again.",
    DEVICE_MISMATCH:
      "This key is bound to a different device. Contact support.",
    LOCKED: "Too many attempts. Please wait and try again.",
    OFFLINE: "Connect to the internet to continue.",
    GENERIC: "Something went wrong. Please try again.",
    MANIFEST_FAILED: "Could not load skin data. Check your connection.",
  },

  // Splash
  splash: {
    loading: "Loading...",
    verifying: "Verifying key...",
    loadingManifest: "Loading skin data...",
  },
} as const;

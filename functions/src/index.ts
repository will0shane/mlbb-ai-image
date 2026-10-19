import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp();

// Re-export all callable functions
export { activateKey, verifyKey, logoutKey } from "./key-functions";
export {
  createKeys,
  listKeys,
  revokeKey,
  restoreKey,
  resetDevice,
  extendKey,
  deleteKey,
  getAppIcon,
  uploadIcon,
} from "./admin-functions";

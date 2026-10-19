#!/usr/bin/env node

/**
 * set-admin-claim.mjs <email>
 *
 * Sets the admin: true custom claim on a Firebase Auth user.
 *
 * Usage: node data-tools/set-admin-claim.mjs admin@example.com
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node set-admin-claim.mjs <email>");
  process.exit(1);
}

async function main() {
  const app = initializeApp({
    credential: applicationDefault(),
  });

  const auth = getAuth(app);

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin claim set for ${email} (uid: ${user.uid})`);
    console.log("   The user must sign out and sign in again for the claim to take effect.");
  } catch (err) {
    console.error(`❌ Failed to set admin claim for ${email}:`, err);
    process.exit(1);
  }
}

main();

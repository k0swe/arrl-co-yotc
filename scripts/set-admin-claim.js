#!/usr/bin/env node

/**
 * Firebase Admin Custom Claim Script
 *
 * This script sets the 'admin' custom claim on a Firebase Auth user,
 * granting them application administrator permissions.
 *
 * Usage:
 *   node set-admin-claim.js <userId>
 *
 * Environment:
 *   - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account key (required)
 *   - FIREBASE_PROJECT_ID: Firebase project ID (optional, defaults to 'arrl-co-yotc')
 *
 * Example:
 *   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
 *   node set-admin-claim.js "user123abc"
 *
 *   # For a different project:
 *   export FIREBASE_PROJECT_ID="my-other-project"
 *   node set-admin-claim.js "user123abc"
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Error: User ID is required");
  console.error("");
  console.error("Usage: node set-admin-claim.js <userId>");
  console.error("");
  console.error("Example:");
  console.error('  node set-admin-claim.js "abc123def456"');
  process.exit(1);
}

const userId = args[0];

// Validate userId format (basic check)
if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
  console.error("Error: Invalid user ID format");
  console.error("User ID must be a non-empty string");
  process.exit(1);
}

/**
 * Main function to set admin custom claim
 */
async function setAdminClaim() {
  try {
    console.log("Initializing Firebase Admin SDK...");

    // Get project ID from environment or use repository default
    // The default is set to this repository's Firebase project
    const projectId = process.env.FIREBASE_PROJECT_ID || "arrl-co-yotc";

    console.log(`Using Firebase project: ${projectId}`);

    // Initialize Firebase Admin
    // This will use GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or default application credentials
    initializeApp({
      projectId: projectId,
    });

    const auth = getAuth();

    console.log(`Setting admin custom claim for user: ${userId}`);

    // Verify user exists first
    try {
      const userRecord = await auth.getUser(userId);
      console.log(`Found user: ${userRecord.email || userRecord.uid}`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        console.error(`Error: User with ID '${userId}' not found`);
        console.error("Please verify the user ID is correct");
        process.exit(1);
      }
      throw error;
    }

    // Set custom claims
    await auth.setCustomUserClaims(userId, { admin: true });

    console.log("✓ Successfully set admin custom claim");
    console.log("");
    console.log("Note: The user will need to sign out and sign back in");
    console.log("for the new custom claims to take effect.");
    console.log("");

    // Verify the claim was set
    const userRecord = await auth.getUser(userId);
    if (userRecord.customClaims && userRecord.customClaims.admin === true) {
      console.log("✓ Verified: Admin claim is now set on the user");
    } else {
      console.warn("⚠ Warning: Could not verify admin claim was set");
    }
  } catch (error) {
    console.error("Error setting admin claim:");
    console.error(error.message);

    if (error.code === "app/invalid-credential") {
      console.error("");
      console.error("Please ensure you have set up Firebase Admin credentials:");
      console.error("1. Download a service account key from Firebase Console");
      console.error("2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable");
      console.error('   export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"');
    }

    process.exit(1);
  }
}

// Run the script
setAdminClaim();

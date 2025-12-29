# Administrative Scripts

This directory contains administrative scripts for managing the ARRL Colorado Year of the Club
application.

## Prerequisites

Before running any scripts, you need to:

1. **Install dependencies:**

   ```bash
   cd scripts
   npm install
   ```

2. **Set up Firebase Admin credentials:**

   Download a service account key from the Firebase Console:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

   Then set the environment variable:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

3. **(Optional) Configure Firebase project:**

   The script defaults to the `arrl-co-yotc` project. To use a different project:

   ```bash
   export FIREBASE_PROJECT_ID="your-project-id"
   ```

## Scripts

### set-admin-claim.js

Sets the `admin` custom claim on a Firebase Auth user, granting them application administrator
permissions.

**Usage:**

```bash
node set-admin-claim.js <userId>
```

**Arguments:**

- `userId` - The Firebase Auth user ID (UID) to grant admin permissions

**Example:**

```bash
# Set admin claim for user in default project
node set-admin-claim.js "abc123def456"

# Or use npm script
npm run set-admin -- "abc123def456"

# For a different Firebase project
export FIREBASE_PROJECT_ID="my-other-project"
node set-admin-claim.js "abc123def456"
```

**Environment Variables:**

- `GOOGLE_APPLICATION_CREDENTIALS` - Required. Path to Firebase service account key JSON file
- `FIREBASE_PROJECT_ID` - Optional. Firebase project ID (defaults to 'arrl-co-yotc')

**Important Notes:**

- The user must already exist in Firebase Auth
- After setting the claim, the user must sign out and sign back in for the changes to take effect
- The admin claim enables full access to all Firestore data via security rules
- Use this script carefully and only grant admin access to trusted users

**Finding User IDs:**

To find a user's Firebase Auth UID, you can:

1. Check the Firebase Console under Authentication → Users
2. Look in the Firestore `users` collection (the document ID is the user's UID)
3. Have the user log in and check their profile (the UID is displayed to authenticated users)

## Security Considerations

- **Never commit** the service account key JSON file to version control
- The service account key file grants full access to your Firebase project
- Store the key securely and limit access to authorized administrators only
- Rotate service account keys periodically as a security best practice
- Only grant admin permissions to users who need full system access

## Troubleshooting

### "Invalid credential" error

- Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly
- Verify the service account key file exists and is valid JSON
- Check that the service account has the "Firebase Admin SDK Administrator Service Agent" role

### "User not found" error

- Verify the user ID is correct
- Check that the user has signed up/logged in at least once
- User IDs are case-sensitive

### Custom claims not taking effect

- The user must sign out and sign back in after the claim is set
- It may take a few minutes for the claim to propagate
- Force refresh the ID token in the application if needed

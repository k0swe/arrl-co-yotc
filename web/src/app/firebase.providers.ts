import { Provider } from '@angular/core';
import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, FirebaseStorage, getStorage } from 'firebase/storage';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
  FIREBASE_STORAGE,
} from './firebase.tokens';

export interface FirebaseServicesOptions {
  appName?: string;
  authEmulatorUrl?: string;
  authDisableWarnings?: boolean;
  firestoreEmulator?: {
    host: string;
    port: number;
  };
  storageEmulator?: {
    host: string;
    port: number;
  };
}

const connectedAuthInstances = new WeakSet<Auth>();
const connectedFirestoreInstances = new WeakSet<Firestore>();
const connectedStorageInstances = new WeakSet<FirebaseStorage>();

function getOrInitializeApp(config: FirebaseOptions, appName?: string): FirebaseApp {
  const existingApp = getApps().find((app) => app.name === (appName ?? '[DEFAULT]'));
  if (existingApp) {
    return existingApp;
  }

  return appName ? initializeApp(config, appName) : initializeApp(config);
}

export function provideFirebaseServices(
  config: FirebaseOptions,
  options: FirebaseServicesOptions = {},
): Provider[] {
  const app = getOrInitializeApp(config, options.appName);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  if (options.authEmulatorUrl && !connectedAuthInstances.has(auth)) {
    connectAuthEmulator(auth, options.authEmulatorUrl, {
      disableWarnings: options.authDisableWarnings ?? true,
    });
    connectedAuthInstances.add(auth);
  }

  if (options.firestoreEmulator && !connectedFirestoreInstances.has(firestore)) {
    connectFirestoreEmulator(
      firestore,
      options.firestoreEmulator.host,
      options.firestoreEmulator.port,
    );
    connectedFirestoreInstances.add(firestore);
  }

  if (options.storageEmulator && !connectedStorageInstances.has(storage)) {
    connectStorageEmulator(
      storage,
      options.storageEmulator.host,
      options.storageEmulator.port,
    );
    connectedStorageInstances.add(storage);
  }

  return [
    { provide: FIREBASE_APP, useValue: app },
    { provide: FIREBASE_AUTH, useValue: auth },
    { provide: FIREBASE_FIRESTORE, useValue: firestore },
    { provide: FIREBASE_STORAGE, useValue: storage },
  ];
}

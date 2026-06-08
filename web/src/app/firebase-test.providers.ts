import { Provider } from '@angular/core';
import { provideFirebaseServices } from './firebase.providers';
import { firebaseTestConfig } from './firebase-test.config';

export interface FirebaseTestProvidersOptions {
  auth?: boolean;
  firestore?: boolean;
  storage?: boolean;
}

export function provideFirebaseTestServices(
  _name: string,
  options: FirebaseTestProvidersOptions = {},
): Provider[] {
  return provideFirebaseServices(firebaseTestConfig, {
    appName: 'test-app',
    authEmulatorUrl: options.auth ? 'http://127.0.0.1:9099' : undefined,
    firestoreEmulator: options.firestore ? { host: '127.0.0.1', port: 8080 } : undefined,
    storageEmulator: options.storage ? { host: '127.0.0.1', port: 9199 } : undefined,
  });
}

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

console.log({
  hasApiKey: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
});

// Flag to display a prominent error in Russian if the client credentials are not defined
const defaultApiKey = "AIzaSyAnM4nfGgyglPyE9lac5QJa1y0PvQMj7uc";
export const isFirebaseConfigMissing = !import.meta.env.VITE_FIREBASE_API_KEY && !defaultApiKey;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

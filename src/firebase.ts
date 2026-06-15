import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyAnM4nfGgyglPyE9lac5QJa1y0PvQMj7uc",
  authDomain: "terra-dashboard-acaab.firebaseapp.com",
  databaseURL: "https://terra-dashboard-acaab-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "terra-dashboard-acaab",
  storageBucket: "terra-dashboard-acaab.firebasestorage.app",
  messagingSenderId: "1074059128790",
  appId: "1:1074059128790:web:872b811d0e9b7317657e77",
  measurementId: "G-W3XKGE8PWH",
};

function cleanEnv(value: any) {
  if (!value) return "";
  const trimmed = String(value).trim();

  const placeholders = [
    "apiKey",
    "projectId",
    "authDomain",
    "databaseURL",
    "storageBucket",
    "messagingSenderId",
    "appId",
    "measurementId",
    "Secret value"
  ];

  if (placeholders.includes(trimmed)) return "";
  return trimmed;
}

function validApiKey(value: any) {
  return typeof value === "string" && value.startsWith("AIza") && value.length > 30;
}

const envApiKey = cleanEnv((import.meta as any).env.VITE_FIREBASE_API_KEY);

export const firebaseConfig = {
  apiKey: validApiKey(envApiKey) ? envApiKey : fallbackFirebaseConfig.apiKey,
  authDomain: cleanEnv((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN) || fallbackFirebaseConfig.authDomain,
  databaseURL: cleanEnv((import.meta as any).env.VITE_FIREBASE_DATABASE_URL) || fallbackFirebaseConfig.databaseURL,
  projectId: cleanEnv((import.meta as any).env.VITE_FIREBASE_PROJECT_ID) || fallbackFirebaseConfig.projectId,
  storageBucket: cleanEnv((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET) || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: cleanEnv((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID) || fallbackFirebaseConfig.messagingSenderId,
  appId: cleanEnv((import.meta as any).env.VITE_FIREBASE_APP_ID) || fallbackFirebaseConfig.appId,
  measurementId: cleanEnv((import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID) || fallbackFirebaseConfig.measurementId,
};

console.log("=== Firebase Client ID Token Config Diagnostics ===");
console.log({
  hasApiKey: Boolean(firebaseConfig.apiKey),
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

console.log("Masked Firebase Config:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 8) + "..." : "none"
});

// Flag to display a prominent error in Russian if the client credentials are not defined
export const isFirebaseConfigMissing = !firebaseConfig.apiKey;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

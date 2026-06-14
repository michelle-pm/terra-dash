import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnM4nfGgyglPyE9lac5QJa1y0PvQMj7uc",
  authDomain: "terra-dashboard-acaab.firebaseapp.com",
  databaseURL: "https://terra-dashboard-acaab-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "terra-dashboard-acaab",
  storageBucket: "terra-dashboard-acaab.firebasestorage.app",
  messagingSenderId: "1074059128790",
  appId: "1:1074059128790:web:872b811d0e9b7317657e77",
  measurementId: "G-W3XKGE8PWH"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics safely to prevent errors in sandboxed iframes or private windows
export let analytics: any = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized successfully.");
      } else {
        console.warn("Firebase Analytics is not supported in this environment (e.g. storage or IndexedDB are disabled).");
      }
    })
    .catch((error) => {
      console.warn("Could not check if Firebase Analytics is supported:", error);
    });
}

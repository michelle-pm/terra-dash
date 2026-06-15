import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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

export const serverApp = initializeApp(firebaseConfig, "serverApp");
export const serverRtdb = getDatabase(serverApp);

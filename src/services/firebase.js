import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyCPLRZmZU-c_9r7qY2Lg7jsiTkByLZTrCw",
  authDomain: "zenith-agro.firebaseapp.com",
  projectId: "zenith-agro",
  storageBucket: "zenith-agro.firebasestorage.app",
  messagingSenderId: "407871329650",
  appId: "1:407871329650:web:6ae7951cf611f162ca79eb",
  measurementId: "G-1NRTD8X4JD",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export let analytics = null;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export default app;
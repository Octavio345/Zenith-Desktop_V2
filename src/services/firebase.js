// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCPLRZmZU-c_9r7qY2Lg7jsiTkByLZTrCw",
  authDomain: "zenith-agro.firebaseapp.com",
  projectId: "zenith-agro",
  storageBucket: "zenith-agro.firebasestorage.app",
  messagingSenderId: "407871329650",
  appId: "1:407871329650:web:6ae7951cf611f162ca79eb",
  measurementId: "G-1NRTD8X4JD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
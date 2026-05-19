// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChfnvY4MDycodtNHAofYTlJ8DGGPzNCe0",
  authDomain: "ptis-erp.firebaseapp.com",
  projectId: "ptis-erp",
  storageBucket: "ptis-erp.firebasestorage.app",
  messagingSenderId: "453746200546",
  appId: "1:453746200546:web:d984a07306c55b2201f3bb",
  measurementId: "G-KS3J23C85G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
export default app;

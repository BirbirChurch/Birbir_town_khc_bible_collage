import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyBYYL0yx9T7M5v9L5ZoQjWVBj-cJJwMCi4",
  authDomain: "birbir-town-khc-bible-school.firebaseapp.com",
  projectId: "birbir-town-khc-bible-school",
  storageBucket: "birbir-town-khc-bible-school.firebasestorage.app",
  messagingSenderId: "1056057220752",
  appId: "1:1056057220752:web:1c6caf86b0e1bdc34b4215"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

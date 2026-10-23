import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyCuV4yv3-LMRKblyBChq0EFcBMbTPEuB5Q",
  authDomain: "birbir-town-khc-bible-co-49af7.firebaseapp.com",
  projectId: "birbir-town-khc-bible-co-49af7",
  storageBucket: "birbir-town-khc-bible-co-49af7.firebasestorage.app",
  messagingSenderId: "533988506860",
  appId: "1:533988506860:web:e01d7b94c5e9c6eab6f9c9"
};


const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

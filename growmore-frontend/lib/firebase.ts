import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
}

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  }
  return auth;
};

export const getFirebaseToken = async (): Promise<string | null> => {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

export const signInWithEmail = async (email: string, password: string) => {
  const auth = getFirebaseAuth();
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
) => {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
};

export const signInWithGoogle = async () => {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const signOut = async () => {
  const auth = getFirebaseAuth();
  return await firebaseSignOut(auth);
};

export const resetPassword = async (email: string) => {
  const auth = getFirebaseAuth();
  return await sendPasswordResetEmail(auth, email);
};

export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

export { auth };

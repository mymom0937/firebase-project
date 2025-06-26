import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
import {getFirestore} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQjWwk6vr1d6XGE5hl6lbF6-vQ-pWjkhg",
  authDomain: "fir-project-37075.firebaseapp.com",
  projectId: "fir-project-37075",
  storageBucket: "fir-project-37075.firebasestorage.app",
  messagingSenderId: "246276873495",
  appId: "1:246276873495:web:cce254d717301bbdc2ab52",
  measurementId: "G-GZ7WVC6GDD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider= new GoogleAuthProvider();
export const db = getFirestore(app);

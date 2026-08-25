import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ta configuration officielle
const firebaseConfig = {
  apiKey: "AIzaSyA8moMjFA7oBO5LRBNiPHBJmjilefVEg5o",
  authDomain: "histoire-nationale.firebaseapp.com",
  projectId: "histoire-nationale",
  storageBucket: "histoire-nationale.firebasestorage.app",
  messagingSenderId: "451701053568",
  appId: "1:451701053568:web:3b99396dd35079c59a6e65",
  measurementId: "G-LWH10XQWL0"
};

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// Initialisation de la base de données (Essentiel pour sauvegarder les résultats)
export const db = getFirestore(app);

// Authentification (portail enseignant uniquement — l'app élève n'en a pas besoin)
export const auth = getAuth(app);
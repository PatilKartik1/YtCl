// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcFvvw-ix4T9JZ9_Cl2Cqz4DDlLIS6xbU",
  authDomain: "ytcl-96e90.firebaseapp.com",
  projectId: "ytcl-96e90",
  storageBucket: "ytcl-96e90.firebasestorage.app",
  messagingSenderId: "506403152619",
  appId: "1:506403152619:web:33f6205464a5e0e61494ae",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };

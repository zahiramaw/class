import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD-S8g40dB9SqFfBCBYurviH0DrxVNI7Q8",
    authDomain: "zcm-track.firebaseapp.com",
    projectId: "zcm-track",
    storageBucket: "zcm-track.firebasestorage.app",
    messagingSenderId: "756102297004",
    appId: "1:756102297004:web:733239f82cd74bfcd9f609"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, getDocs, addDoc, query, where, doc, setDoc, deleteDoc, getDoc };

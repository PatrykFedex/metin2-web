// firebase-config.js
// Uzupełnij databaseURL wg swojej bazy RTDB. Możesz też ustawić fallback logowania email/password.
export const firebaseConfig = {
  apiKey: "AIzaSyAKwaR7Pwax83vBxYetWYlQEo9ep0cS6As",
  authDomain: "mt2test-cc1a5.firebaseapp.com",
  databaseURL: "https://mt2test-cc1a5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mt2test-cc1a5",
  storageBucket: "mt2test-cc1a5.appspot.com",
  messagingSenderId: "543060114897",
  appId: "1:543060114897:web:b0818476499e620083b4f0",
  measurementId: "G-6YNZCQ5HN2",

  // Fallback (opcjonalny): ustaw konto testowe w Authentication → Users
  guestEmail: "",   // np. "guest@mt2.local"
  guestPassword: "" // np. "TwojeHaslo"
};

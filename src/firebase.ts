import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Ensure you include the exact firestoreDatabaseId from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection verification logic as requested in the Firebase Integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-doc', 'connection'));
    console.log("Firebase connection test succeeded.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.warn("Firebase connection test completed/notified:", error);
    }
  }
}
testConnection();

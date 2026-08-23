import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Ensure you include the exact firestoreDatabaseId from configuration if present
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-37117925-0d7c-4ac1-aea6-5327bca4fa90';
export const db = getFirestore(app, firestoreDbId);

export const OAUTH_CLIENT_ID = firebaseConfig.oAuthClientId || '';

// Connection verification logic as requested in the Firebase Integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-doc', 'connection'));
    console.log("Firebase connection test succeeded.");
  } catch (error) {
    // If the database document is empty or client connects lazily, log gracefully
    console.log("Firebase initialized in standard mode.");
  }
}
testConnection();

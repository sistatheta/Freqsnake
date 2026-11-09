import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  setDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  getDocFromServer,
  Timestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { HighScoreEntry } from '../types';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on startup
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'leaderboard', 'connection_test'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore: client is offline or network unavailable.");
      return false;
    }
    // Permissions error on non-existent document is normal during startup validation
    return true;
  }
}

// Global Leaderboard Listeners & API
const LEADERBOARD_COLLECTION = 'leaderboard';

export function subscribeToGlobalLeaderboard(callback: (entries: HighScoreEntry[]) => void): () => void {
  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    orderBy('score', 'desc'),
    limit(10)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: HighScoreEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
        entries.push({
          name: data.name || 'ANON',
          score: data.score || 0,
          timestamp: createdAt,
        });
      });
      callback(entries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LEADERBOARD_COLLECTION);
    }
  );

  return unsubscribe;
}

export async function addGlobalHighScore(name: string, score: number): Promise<void> {
  const sanitizedName = (name.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 3)) || 'AAA';
  const scoreId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, LEADERBOARD_COLLECTION, scoreId);

  try {
    await setDoc(docRef, {
      name: sanitizedName,
      score: Math.max(0, Math.floor(score)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LEADERBOARD_COLLECTION}/${scoreId}`);
  }
}

import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../lib/firebase'

const DEMO_PROFILES_KEY = 'car-share-demo-profiles'

function readDemoProfiles() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_PROFILES_KEY)) || {}
  } catch {
    return {}
  }
}

function writeDemoProfile(uid, profile) {
  const profiles = readDemoProfiles()
  profiles[uid] = profile
  localStorage.setItem(DEMO_PROFILES_KEY, JSON.stringify(profiles))
}

export const firestoreProfileService = {
  subscribe(uid, onData, onError) {
    if (!uid) {
      onData(null)
      return () => {}
    }
    return onSnapshot(
      doc(db, 'profiles', uid),
      (snapshot) => onData(snapshot.exists() ? { uid, ...snapshot.data() } : null),
      onError,
    )
  },

  async get(uid) {
    const snapshot = await getDoc(doc(db, 'profiles', uid))
    return snapshot.exists() ? { uid, ...snapshot.data() } : null
  },

  async uploadPhoto(user, file) {
    if (!file?.type?.startsWith('image/')) throw new Error('Choisissez une image.')
    if (file.size > 5 * 1024 * 1024) throw new Error('Image trop lourde (max 5 Mo).')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const objectRef = ref(storage, `profiles/${user.uid}/avatar.${extension}`)
    await uploadBytes(objectRef, file, { contentType: file.type })
    const photoURL = await getDownloadURL(objectRef)
    await setDoc(
      doc(db, 'profiles', user.uid),
      {
        displayName: user.displayName || user.firstName || 'Utilisateur',
        photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return photoURL
  },

  async ensureFromAuth(user) {
    if (!user?.uid || !user.photoURL) return null
    const existing = await getDoc(doc(db, 'profiles', user.uid))
    if (existing.exists() && existing.data().photoURL) return existing.data().photoURL
    await setDoc(
      doc(db, 'profiles', user.uid),
      {
        displayName: user.displayName || user.firstName || 'Utilisateur',
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return user.photoURL
  },
}

export const demoProfileService = {
  subscribe(uid, onData) {
    const emit = () => onData(uid ? readDemoProfiles()[uid] || null : null)
    emit()
    window.addEventListener('storage', emit)
    return () => window.removeEventListener('storage', emit)
  },
  async get(uid) {
    return readDemoProfiles()[uid] || null
  },
  async uploadPhoto(user, file) {
    const photoURL = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Impossible de lire l’image.'))
      reader.readAsDataURL(file)
    })
    writeDemoProfile(user.uid, {
      uid: user.uid,
      displayName: user.displayName || user.firstName,
      photoURL,
      updatedAt: Date.now(),
    })
    return photoURL
  },
  async ensureFromAuth() {
    return null
  },
}

import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { firestoreProfileService } from '../services/profileService'

const DEMO_PROFILES_KEY = 'car-share-demo-profiles'

function chunk(list, size) {
  const groups = []
  for (let index = 0; index < list.length; index += size) {
    groups.push(list.slice(index, index + size))
  }
  return groups
}

export function useProfiles({ uids, isDemo, currentUser }) {
  const uniqueIds = useMemo(
    () => [...new Set(uids.filter(Boolean))],
    [uids],
  )
  const [profiles, setProfiles] = useState({})

  useEffect(() => {
    if (isDemo) {
      const read = () => {
        try {
          setProfiles(JSON.parse(localStorage.getItem(DEMO_PROFILES_KEY)) || {})
        } catch {
          setProfiles({})
        }
      }
      read()
      window.addEventListener('storage', read)
      return () => window.removeEventListener('storage', read)
    }

    if (!uniqueIds.length) {
      setProfiles({})
      return undefined
    }

    const unsubscribers = chunk(uniqueIds, 10).map((group) =>
      onSnapshot(
        query(collection(db, 'profiles'), where(documentId(), 'in', group)),
        (snapshot) => {
          setProfiles((current) => {
            const next = { ...current }
            snapshot.docs.forEach((item) => {
              next[item.id] = { uid: item.id, ...item.data() }
            })
            return next
          })
        },
      ),
    )

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [isDemo, uniqueIds.join('|')])

  useEffect(() => {
    if (!currentUser || isDemo) return undefined
    firestoreProfileService.ensureFromAuth(currentUser).catch(() => {})
    return undefined
  }, [currentUser, isDemo])

  const resolvedPhotoURL =
    profiles[currentUser?.uid]?.photoURL
    || currentUser?.photoURL
    || null

  return {
    profiles,
    photoURL: resolvedPhotoURL,
  }
}

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  LEGACY_DEFAULT_DATE,
  LEG_ALLER,
  isDateNotPast,
  isValidISODate,
  membershipDocId,
  normalizeLeg,
} from '../lib/trip'

const DEMO_KEY = 'car-share-demo-cars'
const DEMO_EVENT = 'car-share-demo-change'

export class BusinessError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BusinessError'
  }
}

const publicUser = (user) => ({ uid: user.uid, name: user.firstName || user.displayName })
const memberIds = (car) => [
  car.driver.uid,
  ...car.passengers.map((member) => member.uid),
  ...car.waitlist.map((member) => member.uid),
]
const trunkOf = (car) => (Array.isArray(car.trunk) ? car.trunk : [])

function validateCarInput(input, minimumSeats = 1, { requireFutureDate = true } = {}) {
  const city = input.city.trim()
  const time = input.time.trim()
  const seats = Number(input.seats)
  const leg = normalizeLeg(input.leg)
  const date = (input.date || '').trim()

  if (city.length < 2 || city.length > 80) {
    throw new BusinessError(
      leg === 'retour'
        ? 'La destination doit contenir 2 à 80 caractères.'
        : 'Le lieu de départ doit contenir 2 à 80 caractères.',
    )
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BusinessError('Choisissez une heure valide.')
  if (!Number.isInteger(seats) || seats < minimumSeats || seats > 8) {
    throw new BusinessError(`Le nombre de places doit être compris entre ${minimumSeats} et 8.`)
  }
  if (!isValidISODate(date)) throw new BusinessError('Choisissez une date valide.')
  if (requireFutureDate && !isDateNotPast(date)) {
    throw new BusinessError('La date de départ ne peut pas être dans le passé.')
  }
  return { city, time, seats, leg, date }
}

function normalizeCar(id, data) {
  return {
    id,
    ...data,
    leg: normalizeLeg(data.leg),
    date: isValidISODate(data.date) ? data.date : LEGACY_DEFAULT_DATE,
    passengers: data.passengers || [],
    waitlist: data.waitlist || [],
    trunk: trunkOf(data),
  }
}

function normalizeSnapshot(snapshot) {
  return snapshot.docs.map((item) => normalizeCar(item.id, item.data()))
}

function validateTrunkText(text) {
  const clean = text.trim()
  if (clean.length < 1 || clean.length > 200) {
    throw new BusinessError('L’objet du coffre doit contenir 1 à 200 caractères.')
  }
  return clean
}

function membershipRefFor(uid, leg) {
  return doc(db, 'memberships', membershipDocId(uid, leg))
}

function legacyMembershipRef(uid) {
  return doc(db, 'memberships', uid)
}

async function assertFreeForLeg(transaction, user, leg) {
  const modernRef = membershipRefFor(user.uid, leg)
  const modern = await transaction.get(modernRef)
  if (modern.exists()) {
    const existingCar = await transaction.get(doc(db, 'cars', modern.data().carId))
    if (existingCar.exists()) {
      throw new BusinessError(
        leg === 'retour'
          ? 'Vous êtes déjà lié·e à une voiture pour le retour.'
          : 'Vous êtes déjà lié·e à une voiture pour l’aller.',
      )
    }
    transaction.delete(modernRef)
  }

  // Anciens docs memberships/{uid} (avant aller/retour) : valables pour l'aller uniquement.
  if (leg === LEG_ALLER) {
    const legacyRef = legacyMembershipRef(user.uid)
    const legacy = await transaction.get(legacyRef)
    if (legacy.exists()) {
      const existingCar = await transaction.get(doc(db, 'cars', legacy.data().carId))
      if (existingCar.exists()) {
        const existingLeg = normalizeLeg(existingCar.data().leg)
        if (existingLeg === LEG_ALLER) {
          throw new BusinessError('Vous êtes déjà lié·e à une voiture pour l’aller.')
        }
      }
      transaction.delete(legacyRef)
    }
  }
}

export const firestoreCarService = {
  subscribe(onData, onError) {
    return onSnapshot(
      query(collection(db, 'cars'), orderBy('createdAt', 'asc')),
      (snapshot) => onData(normalizeSnapshot(snapshot)),
      onError,
    )
  },

  async createCar(user, input) {
    const values = validateCarInput(input)
    const carRef = doc(collection(db, 'cars'))
    const membershipRef = membershipRefFor(user.uid, values.leg)
    await runTransaction(db, async (transaction) => {
      await assertFreeForLeg(transaction, user, values.leg)
      const driver = publicUser(user)
      transaction.set(carRef, {
        ...values,
        driver,
        passengers: [],
        waitlist: [],
        trunk: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      transaction.set(membershipRef, {
        uid: user.uid,
        carId: carRef.id,
        role: 'driver',
        displayName: driver.name,
        leg: values.leg,
        createdAt: serverTimestamp(),
      })
    })
  },

  async updateCar(user, carId, input) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      const car = snapshot.data()
      if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut modifier cette voiture.')
      const values = validateCarInput(
        { ...input, leg: car.leg || LEG_ALLER },
        (car.passengers || []).length + 1,
      )
      transaction.update(carRef, {
        city: values.city,
        time: values.time,
        seats: values.seats,
        date: values.date,
        leg: normalizeLeg(car.leg),
        updatedAt: serverTimestamp(),
      })
    })
  },

  async joinCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      const car = snapshot.data()
      const leg = normalizeLeg(car.leg)
      await assertFreeForLeg(transaction, user, leg)

      const member = publicUser(user)
      const passengers = car.passengers || []
      const waitlist = car.waitlist || []
      const role = passengers.length + 1 < car.seats ? 'passenger' : 'waitlist'
      if (role === 'waitlist' && waitlist.length >= 30) {
        throw new BusinessError('La liste d’attente est complète.')
      }
      transaction.update(carRef, {
        [role === 'passenger' ? 'passengers' : 'waitlist']: [
          ...(role === 'passenger' ? passengers : waitlist),
          member,
        ],
        updatedAt: serverTimestamp(),
      })
      transaction.set(membershipRefFor(user.uid, leg), {
        uid: user.uid,
        carId,
        role,
        displayName: member.name,
        leg,
        createdAt: serverTimestamp(),
      })
    })
  },

  async leaveCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) {
        const modernAller = membershipRefFor(user.uid, 'aller')
        const modernRetour = membershipRefFor(user.uid, 'retour')
        const legacy = legacyMembershipRef(user.uid)
        const refs = [modernAller, modernRetour, legacy]
        const snaps = []
        for (const ref of refs) snaps.push(await transaction.get(ref))
        snaps.forEach((snap, index) => {
          if (snap.exists() && snap.data().carId === carId) transaction.delete(refs[index])
        })
        return
      }
      const car = snapshot.data()
      const leg = normalizeLeg(car.leg)
      const membershipRef = membershipRefFor(user.uid, leg)
      const legacyRef = legacyMembershipRef(user.uid)
      const membership = await transaction.get(membershipRef)
      const legacy = leg === LEG_ALLER ? await transaction.get(legacyRef) : null
      const active =
        (membership.exists() && membership.data().carId === carId && membership)
        || (legacy?.exists() && legacy.data().carId === carId && legacy)
      if (!active) throw new BusinessError('Votre inscription est déjà absente.')
      if (car.driver.uid === user.uid) throw new BusinessError('Supprimez votre voiture pour la quitter.')
      transaction.update(carRef, {
        passengers: (car.passengers || []).filter((member) => member.uid !== user.uid),
        waitlist: (car.waitlist || []).filter((member) => member.uid !== user.uid),
        updatedAt: serverTimestamp(),
      })
      if (membership.exists()) transaction.delete(membershipRef)
      if (legacy?.exists() && legacy.data().carId === carId) transaction.delete(legacyRef)
    })
  },

  async deleteCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) return
      const car = normalizeCar(carId, snapshot.data())
      if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut supprimer cette voiture.')
      const leg = car.leg
      const membershipRefs = memberIds(car).flatMap((uid) => {
        const refs = [membershipRefFor(uid, leg)]
        if (leg === LEG_ALLER) refs.push(legacyMembershipRef(uid))
        return refs
      })
      for (const ref of membershipRefs) await transaction.get(ref)
      transaction.delete(carRef)
      membershipRefs.forEach((ref) => transaction.delete(ref))
    })
  },

  async addTrunkItem(user, carId, text) {
    const clean = validateTrunkText(text)
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      const trunk = trunkOf(snapshot.data())
      if (trunk.length >= 200) throw new BusinessError('Le coffre est plein.')
      transaction.update(carRef, {
        trunk: [
          ...trunk,
          {
            id: crypto.randomUUID(),
            text: clean,
            authorUid: user.uid,
            authorName: user.firstName || user.displayName,
            createdAt: Timestamp.now(),
          },
        ],
        updatedAt: serverTimestamp(),
      })
    })
  },

  async updateTrunkItem(user, carId, itemId, text) {
    const clean = validateTrunkText(text)
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      const trunk = trunkOf(snapshot.data())
      if (!trunk.some((item) => item.id === itemId)) throw new BusinessError('Cet objet n’existe plus.')
      transaction.update(carRef, {
        trunk: trunk.map((item) => (item.id === itemId ? { ...item, text: clean } : item)),
        updatedAt: serverTimestamp(),
      })
    })
  },

  async removeTrunkItem(user, carId, itemId) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      transaction.update(carRef, {
        trunk: trunkOf(snapshot.data()).filter((item) => item.id !== itemId),
        updatedAt: serverTimestamp(),
      })
    })
  },
}

function readDemoCars() {
  try {
    return (JSON.parse(localStorage.getItem(DEMO_KEY)) || []).map((car) =>
      normalizeCar(car.id, car),
    )
  } catch {
    return []
  }
}

function writeDemoCars(cars) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(cars))
  window.dispatchEvent(new Event(DEMO_EVENT))
}

function occupiedOnLeg(cars, uid, leg) {
  return cars.some(
    (car) => normalizeLeg(car.leg) === leg && memberIds(car).includes(uid),
  )
}

export const demoCarService = {
  subscribe(onData) {
    const emit = () => onData(readDemoCars())
    emit()
    window.addEventListener(DEMO_EVENT, emit)
    window.addEventListener('storage', emit)
    return () => {
      window.removeEventListener(DEMO_EVENT, emit)
      window.removeEventListener('storage', emit)
    }
  },
  async createCar(user, input) {
    const values = validateCarInput(input)
    const cars = readDemoCars()
    if (occupiedOnLeg(cars, user.uid, values.leg)) {
      throw new BusinessError(
        values.leg === 'retour'
          ? 'Vous êtes déjà lié·e à une voiture pour le retour.'
          : 'Vous êtes déjà lié·e à une voiture pour l’aller.',
      )
    }
    writeDemoCars([
      ...cars,
      {
        id: crypto.randomUUID(),
        ...values,
        driver: publicUser(user),
        passengers: [],
        waitlist: [],
        trunk: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ])
  },
  async updateCar(user, carId, input) {
    writeDemoCars(
      readDemoCars().map((car) => {
        if (car.id !== carId) return car
        if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut modifier cette voiture.')
        const values = validateCarInput({ ...input, leg: car.leg }, car.passengers.length + 1)
        return {
          ...car,
          city: values.city,
          time: values.time,
          seats: values.seats,
          date: values.date,
          updatedAt: Date.now(),
        }
      }),
    )
  },
  async joinCar(user, carId) {
    const cars = readDemoCars()
    const target = cars.find((car) => car.id === carId)
    if (!target) throw new BusinessError('Cette voiture n’existe plus.')
    if (occupiedOnLeg(cars, user.uid, target.leg)) {
      throw new BusinessError(
        target.leg === 'retour'
          ? 'Vous êtes déjà lié·e à une voiture pour le retour.'
          : 'Vous êtes déjà lié·e à une voiture pour l’aller.',
      )
    }
    writeDemoCars(
      cars.map((car) => {
        if (car.id !== carId) return car
        const member = publicUser(user)
        if (car.passengers.length + 1 < car.seats) return { ...car, passengers: [...car.passengers, member] }
        if (car.waitlist.length >= 30) throw new BusinessError('La liste d’attente est complète.')
        return { ...car, waitlist: [...car.waitlist, member] }
      }),
    )
  },
  async leaveCar(user, carId) {
    writeDemoCars(
      readDemoCars().map((car) => {
        if (car.id !== carId) return car
        if (car.driver.uid === user.uid) throw new BusinessError('Supprimez votre voiture pour la quitter.')
        return {
          ...car,
          passengers: car.passengers.filter((member) => member.uid !== user.uid),
          waitlist: car.waitlist.filter((member) => member.uid !== user.uid),
        }
      }),
    )
  },
  async deleteCar(user, carId) {
    writeDemoCars(
      readDemoCars().filter((car) => {
        if (car.id !== carId) return true
        if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut supprimer cette voiture.')
        return false
      }),
    )
  },
  async addTrunkItem(user, carId, text) {
    const clean = validateTrunkText(text)
    writeDemoCars(
      readDemoCars().map((car) => {
        if (car.id !== carId) return car
        return {
          ...car,
          trunk: [
            ...trunkOf(car),
            {
              id: crypto.randomUUID(),
              text: clean,
              authorUid: user.uid,
              authorName: user.firstName || user.displayName,
              createdAt: Date.now(),
            },
          ],
          updatedAt: Date.now(),
        }
      }),
    )
  },
  async updateTrunkItem(user, carId, itemId, text) {
    const clean = validateTrunkText(text)
    writeDemoCars(
      readDemoCars().map((car) => {
        if (car.id !== carId) return car
        return {
          ...car,
          trunk: trunkOf(car).map((item) => (item.id === itemId ? { ...item, text: clean } : item)),
          updatedAt: Date.now(),
        }
      }),
    )
  },
  async removeTrunkItem(user, carId, itemId) {
    writeDemoCars(
      readDemoCars().map((car) => {
        if (car.id !== carId) return car
        return {
          ...car,
          trunk: trunkOf(car).filter((item) => item.id !== itemId),
          updatedAt: Date.now(),
        }
      }),
    )
  },
}

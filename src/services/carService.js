import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

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

function validateCarInput(input, minimumSeats = 1) {
  const city = input.city.trim()
  const time = input.time.trim()
  const seats = Number(input.seats)
  if (city.length < 2 || city.length > 80) throw new BusinessError('La ville doit contenir 2 à 80 caractères.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BusinessError('Choisissez une heure valide.')
  if (!Number.isInteger(seats) || seats < minimumSeats || seats > 8) {
    throw new BusinessError(`Le nombre de places doit être compris entre ${minimumSeats} et 8.`)
  }
  return { city, time, seats }
}

function normalizeSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
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
    const membershipRef = doc(db, 'memberships', user.uid)
    await runTransaction(db, async (transaction) => {
      const membership = await transaction.get(membershipRef)
      if (membership.exists()) throw new BusinessError('Vous êtes déjà lié·e à une voiture.')
      const driver = publicUser(user)
      transaction.set(carRef, {
        ...values,
        driver,
        passengers: [],
        waitlist: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      transaction.set(membershipRef, {
        uid: user.uid,
        carId: carRef.id,
        role: 'driver',
        displayName: driver.name,
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
      const values = validateCarInput(input, car.passengers.length + 1)
      transaction.update(carRef, { ...values, updatedAt: serverTimestamp() })
    })
  },

  async joinCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    const membershipRef = doc(db, 'memberships', user.uid)
    await runTransaction(db, async (transaction) => {
      const membership = await transaction.get(membershipRef)
      const snapshot = await transaction.get(carRef)
      if (membership.exists()) throw new BusinessError('Vous êtes déjà lié·e à une voiture.')
      if (!snapshot.exists()) throw new BusinessError('Cette voiture n’existe plus.')
      const car = snapshot.data()
      const member = publicUser(user)
      const role = car.passengers.length + 1 < car.seats ? 'passenger' : 'waitlist'
      if (role === 'waitlist' && car.waitlist.length >= 30) {
        throw new BusinessError('La liste d’attente est complète.')
      }
      transaction.update(carRef, {
        [role === 'passenger' ? 'passengers' : 'waitlist']: [
          ...(role === 'passenger' ? car.passengers : car.waitlist),
          member,
        ],
        updatedAt: serverTimestamp(),
      })
      transaction.set(membershipRef, {
        uid: user.uid,
        carId,
        role,
        displayName: member.name,
        createdAt: serverTimestamp(),
      })
    })
  },

  async leaveCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    const membershipRef = doc(db, 'memberships', user.uid)
    await runTransaction(db, async (transaction) => {
      const membership = await transaction.get(membershipRef)
      const snapshot = await transaction.get(carRef)
      if (!membership.exists() || membership.data().carId !== carId) {
        throw new BusinessError('Votre inscription est déjà absente.')
      }
      if (!snapshot.exists()) {
        transaction.delete(membershipRef)
        return
      }
      const car = snapshot.data()
      if (car.driver.uid === user.uid) throw new BusinessError('Supprimez votre voiture pour la quitter.')
      transaction.update(carRef, {
        passengers: car.passengers.filter((member) => member.uid !== user.uid),
        waitlist: car.waitlist.filter((member) => member.uid !== user.uid),
        updatedAt: serverTimestamp(),
      })
      transaction.delete(membershipRef)
    })
  },

  async deleteCar(user, carId) {
    const carRef = doc(db, 'cars', carId)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(carRef)
      if (!snapshot.exists()) return
      const car = snapshot.data()
      if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut supprimer cette voiture.')
      const membershipRefs = memberIds(car).map((uid) => doc(db, 'memberships', uid))
      for (const ref of membershipRefs) await transaction.get(ref)
      transaction.delete(carRef)
      membershipRefs.forEach((ref) => transaction.delete(ref))
    })
  },
}

function readDemoCars() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY)) || []
  } catch {
    return []
  }
}

function writeDemoCars(cars) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(cars))
  window.dispatchEvent(new Event(DEMO_EVENT))
}

function mutateDemo(user, operation) {
  const cars = readDemoCars()
  const occupied = cars.some((car) => memberIds(car).includes(user.uid))
  const result = operation(cars, occupied)
  writeDemoCars(result)
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
    mutateDemo(user, (cars, occupied) => {
      if (occupied) throw new BusinessError('Vous êtes déjà lié·e à une voiture.')
      return [
        ...cars,
        {
          id: crypto.randomUUID(),
          ...values,
          driver: publicUser(user),
          passengers: [],
          waitlist: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
    })
  },
  async updateCar(user, carId, input) {
    mutateDemo(user, (cars) =>
      cars.map((car) => {
        if (car.id !== carId) return car
        if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut modifier cette voiture.')
        return { ...car, ...validateCarInput(input, car.passengers.length + 1), updatedAt: Date.now() }
      }),
    )
  },
  async joinCar(user, carId) {
    mutateDemo(user, (cars, occupied) => {
      if (occupied) throw new BusinessError('Vous êtes déjà lié·e à une voiture.')
      return cars.map((car) => {
        if (car.id !== carId) return car
        const member = publicUser(user)
        if (car.passengers.length + 1 < car.seats) return { ...car, passengers: [...car.passengers, member] }
        if (car.waitlist.length >= 30) throw new BusinessError('La liste d’attente est complète.')
        return { ...car, waitlist: [...car.waitlist, member] }
      })
    })
  },
  async leaveCar(user, carId) {
    mutateDemo(user, (cars) =>
      cars.map((car) => {
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
    mutateDemo(user, (cars) =>
      cars.filter((car) => {
        if (car.id !== carId) return true
        if (car.driver.uid !== user.uid) throw new BusinessError('Seul le conducteur peut supprimer cette voiture.')
        return false
      }),
    )
  },
}

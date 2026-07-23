import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BusinessError, demoCarService } from './carService'

const alice = { uid: 'alice', firstName: 'Alice' }
const bob = { uid: 'bob', firstName: 'Bob' }

function currentCars() {
  let cars
  const unsubscribe = demoCarService.subscribe((value) => {
    cars = value
  })
  unsubscribe()
  return cars
}

describe('demoCarService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('réserve automatiquement la place du conducteur', async () => {
    await demoCarService.createCar(alice, { city: 'Lyon', time: '08:30', seats: 2 })
    const [car] = currentCars()
    expect(car.driver).toEqual({ uid: 'alice', name: 'Alice' })
    expect(car.passengers).toHaveLength(0)
    expect(car.seats - car.passengers.length - 1).toBe(1)
  })

  it('empêche un utilisateur d’occuper deux voitures', async () => {
    await demoCarService.createCar(alice, { city: 'Lyon', time: '08:30', seats: 2 })
    await expect(
      demoCarService.createCar(alice, { city: 'Paris', time: '09:00', seats: 3 }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it('ajoute à la liste d’attente sans promotion automatique', async () => {
    await demoCarService.createCar(alice, { city: 'Lyon', time: '08:30', seats: 1 })
    const [created] = currentCars()
    await demoCarService.joinCar(bob, created.id)
    expect(currentCars()[0].waitlist[0].uid).toBe('bob')

    await demoCarService.leaveCar(bob, created.id)
    expect(currentCars()[0].passengers).toHaveLength(0)
    expect(currentCars()[0].waitlist).toHaveLength(0)
  })

  it('libère tous les membres lors de la suppression', async () => {
    await demoCarService.createCar(alice, { city: 'Lyon', time: '08:30', seats: 2 })
    const [created] = currentCars()
    await demoCarService.joinCar(bob, created.id)
    await demoCarService.deleteCar(alice, created.id)
    expect(currentCars()).toEqual([])
    await expect(
      demoCarService.createCar(bob, { city: 'Paris', time: '09:00', seats: 2 }),
    ).resolves.toBeUndefined()
  })
})

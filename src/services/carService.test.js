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

const baseInput = { city: 'Lyon', time: '08:30', seats: 2, date: '2026-08-01', leg: 'aller' }

describe('demoCarService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('réserve automatiquement la place du conducteur', async () => {
    await demoCarService.createCar(alice, baseInput)
    const [car] = currentCars()
    expect(car.driver).toEqual({ uid: 'alice', name: 'Alice' })
    expect(car.passengers).toHaveLength(0)
    expect(car.leg).toBe('aller')
    expect(car.date).toBe('2026-08-01')
    expect(car.seats - car.passengers.length - 1).toBe(1)
  })

  it('autorise aller et retour pour le même utilisateur', async () => {
    await demoCarService.createCar(alice, baseInput)
    await demoCarService.createCar(alice, {
      city: 'Paris',
      time: '18:00',
      seats: 3,
      date: '2026-08-02',
      leg: 'retour',
    })
    expect(currentCars()).toHaveLength(2)
  })

  it('empêche deux voitures sur le même sens', async () => {
    await demoCarService.createCar(alice, baseInput)
    await expect(
      demoCarService.createCar(alice, { ...baseInput, city: 'Paris', time: '09:00', seats: 3 }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it('ajoute à la liste d’attente sans promotion automatique', async () => {
    await demoCarService.createCar(alice, { ...baseInput, seats: 1 })
    const [created] = currentCars()
    await demoCarService.joinCar(bob, created.id)
    expect(currentCars()[0].waitlist[0].uid).toBe('bob')

    await demoCarService.leaveCar(bob, created.id)
    expect(currentCars()[0].passengers).toHaveLength(0)
    expect(currentCars()[0].waitlist).toHaveLength(0)
  })

  it('refuse une date passée', async () => {
    await expect(
      demoCarService.createCar(alice, { ...baseInput, date: '2020-01-01' }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it('libère tous les membres lors de la suppression', async () => {
    await demoCarService.createCar(alice, baseInput)
    const [created] = currentCars()
    await demoCarService.joinCar(bob, created.id)
    await demoCarService.deleteCar(alice, created.id)
    expect(currentCars()).toEqual([])
    await expect(
      demoCarService.createCar(bob, { ...baseInput, city: 'Paris' }),
    ).resolves.toBeUndefined()
  })

  it('gère le coffre sans limite UX', async () => {
    await demoCarService.createCar(alice, { ...baseInput, seats: 3 })
    const [created] = currentCars()
    await demoCarService.addTrunkItem(bob, created.id, 'Guitare')
    expect(currentCars()[0].trunk[0].text).toBe('Guitare')
    const itemId = currentCars()[0].trunk[0].id
    await demoCarService.updateTrunkItem(alice, created.id, itemId, '2 guitares')
    expect(currentCars()[0].trunk[0].text).toBe('2 guitares')
    await demoCarService.removeTrunkItem(bob, created.id, itemId)
    expect(currentCars()[0].trunk).toHaveLength(0)
  })
})

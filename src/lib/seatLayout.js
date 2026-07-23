/** Retourne les rangées de sièges (index 0 = conducteur) pour une capacité donnée. */
export function seatRowsForCapacity(seats) {
  const count = Math.min(8, Math.max(1, Number(seats) || 1))
  const layouts = {
    1: [[0]],
    2: [[0, 1]],
    3: [[0], [1, 2]],
    4: [[0, 1], [2, 3]],
    5: [[0, 1], [2, 3, 4]],
    6: [[0, 1], [2, 3], [4, 5]],
    7: [[0, 1], [2, 3, 4], [5, 6]],
    8: [[0, 1], [2, 3, 4], [5, 6, 7]],
  }
  return layouts[count]
}

export function occupantsForCar(car) {
  return [car.driver, ...(car.passengers || [])]
}

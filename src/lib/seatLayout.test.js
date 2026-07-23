import { describe, expect, it } from 'vitest'
import { seatRowsForCapacity } from './seatLayout'

describe('seatRowsForCapacity', () => {
  it('adapte le plan selon le nombre de places', () => {
    expect(seatRowsForCapacity(1)).toEqual([[0]])
    expect(seatRowsForCapacity(4)).toEqual([[0, 1], [2, 3]])
    expect(seatRowsForCapacity(5)).toEqual([[0, 1], [2, 3, 4]])
    expect(seatRowsForCapacity(8).flat()).toHaveLength(8)
  })
})

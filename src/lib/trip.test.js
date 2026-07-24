import { describe, expect, it } from 'vitest'
import {
  LEGACY_DEFAULT_DATE,
  cityLabel,
  formatDateFR,
  isDateNotPast,
  membershipDocId,
  normalizeLeg,
} from './trip'

describe('trip helpers', () => {
  it('normalise leg et labels', () => {
    expect(normalizeLeg(undefined)).toBe('aller')
    expect(normalizeLeg('retour')).toBe('retour')
    expect(cityLabel('aller')).toBe('Départ de')
    expect(cityLabel('retour')).toBe('Destination')
    expect(membershipDocId('u1', 'aller')).toBe('u1__aller')
  })

  it('formate et valide les dates', () => {
    expect(formatDateFR(LEGACY_DEFAULT_DATE)).toBe('31/07/2026')
    expect(isDateNotPast('2099-01-01', '2026-07-24')).toBe(true)
    expect(isDateNotPast('2020-01-01', '2026-07-24')).toBe(false)
  })
})

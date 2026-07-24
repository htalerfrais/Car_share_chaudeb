import { useEffect, useMemo, useState } from 'react'
import {
  LEGACY_DEFAULT_DATE,
  LEG_ALLER,
  cityLabel,
  daysInMonth,
  joinISODate,
  splitISODate,
  todayISO,
} from '../lib/trip'

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function snapMinute(minute) {
  const value = Number(minute)
  if (!Number.isFinite(value)) return '00'
  const snapped = Math.min(55, Math.round(value / 5) * 5)
  return String(snapped).padStart(2, '0')
}

function splitTime(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || '')
  if (!match) return { hour: '08', minute: '00' }
  return {
    hour: match[1],
    minute: MINUTES.includes(match[2]) ? match[2] : snapMinute(match[2]),
  }
}

function defaultForm(leg) {
  return {
    city: '',
    time: '08:00',
    seats: 4,
    date: todayISO() > LEGACY_DEFAULT_DATE ? todayISO() : LEGACY_DEFAULT_DATE,
    leg: leg || LEG_ALLER,
  }
}

export function AddCarForm({ car, leg = LEG_ALLER, onSave, onCancel }) {
  const activeLeg = car?.leg || leg
  const [values, setValues] = useState(() => defaultForm(activeLeg))
  const [submitting, setSubmitting] = useState(false)
  const { hour, minute } = splitTime(values.time)
  const { year, month, day } = splitISODate(values.date)
  const cityTitle = cityLabel(activeLeg)
  const cityPlaceholder = activeLeg === 'retour' ? 'Ex. Lyon' : 'Ex. Paris'

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return [current, current + 1, current + 2].map(String)
  }, [])

  const maxDay = daysInMonth(year, month)
  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, '0')),
    [maxDay],
  )

  useEffect(() => {
    if (car) {
      setValues({
        city: car.city,
        time: car.time,
        seats: car.seats,
        date: car.date || LEGACY_DEFAULT_DATE,
        leg: car.leg || LEG_ALLER,
      })
    } else {
      setValues(defaultForm(leg))
    }
  }, [car, leg])

  useEffect(() => {
    if (Number(day) > maxDay) {
      setValues((current) => ({ ...current, date: joinISODate(year, month, maxDay) }))
    }
  }, [day, maxDay, month, year])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function updateTimePart(part, value) {
    update('time', part === 'hour' ? `${value}:${minute}` : `${hour}:${value}`)
  }

  function updateDatePart(part, value) {
    const next = { year, month, day, [part]: value }
    const cappedDay = Math.min(Number(next.day), daysInMonth(next.year, next.month))
    update('date', joinISODate(next.year, next.month, cappedDay))
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const saved = await onSave({ ...values, leg: activeLeg })
      if (!car && saved !== false) setValues(defaultForm(activeLeg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="car-form panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{car ? 'Mise à jour' : activeLeg === 'retour' ? 'Retour' : 'Aller'}</span>
          <h2>{car ? 'Modifier ma voiture' : 'Je propose une voiture'}</h2>
        </div>
        {onCancel && <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer">×</button>}
      </div>
      <div className="form-grid form-grid-trip">
        <label>
          {cityTitle}
          <input
            required
            minLength="2"
            maxLength="80"
            value={values.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder={cityPlaceholder}
          />
        </label>
        <fieldset className="time-field">
          <legend>Date de départ</legend>
          <div className="date-picker" role="group" aria-label="Date de départ">
            <label className="time-part">
              <span className="visually-hidden">Jour</span>
              <select value={day} onChange={(event) => updateDatePart('day', event.target.value)} aria-label="Jour">
                {days.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="time-part">
              <span className="visually-hidden">Mois</span>
              <select value={month} onChange={(event) => updateDatePart('month', event.target.value)} aria-label="Mois">
                {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="time-part">
              <span className="visually-hidden">Année</span>
              <select value={year} onChange={(event) => updateDatePart('year', event.target.value)} aria-label="Année">
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="time-field">
          <legend>Heure de départ</legend>
          <div className="time-picker" role="group" aria-label="Heure de départ, format 24 heures">
            <label className="time-part">
              <span className="visually-hidden">Heure</span>
              <select value={hour} onChange={(event) => updateTimePart('hour', event.target.value)} aria-label="Heure">
                {HOURS.map((value) => <option key={value} value={value}>{value} h</option>)}
              </select>
            </label>
            <span className="time-separator" aria-hidden="true">:</span>
            <label className="time-part">
              <span className="visually-hidden">Minutes</span>
              <select value={minute} onChange={(event) => updateTimePart('minute', event.target.value)} aria-label="Minutes">
                {MINUTES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </fieldset>
        <label>
          Places totales
          <select value={values.seats} onChange={(event) => update('seats', Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
              <option key={count} value={count}>{count} (conducteur inclus)</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-actions">
        {onCancel && <button type="button" className="button button-ghost" onClick={onCancel}>Annuler</button>}
        <button className="button button-primary" disabled={submitting}>
          {submitting ? 'Enregistrement…' : car ? 'Enregistrer' : 'Proposer ma voiture'}
        </button>
      </div>
    </form>
  )
}

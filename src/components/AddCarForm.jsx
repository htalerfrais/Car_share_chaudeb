import { useEffect, useState } from 'react'

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const EMPTY_FORM = { city: '', time: '08:00', seats: 4 }

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

export function AddCarForm({ car, onSave, onCancel }) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const { hour, minute } = splitTime(values.time)

  useEffect(() => {
    setValues(car ? { city: car.city, time: car.time, seats: car.seats } : EMPTY_FORM)
  }, [car])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function updateTimePart(part, value) {
    const next = part === 'hour' ? `${value}:${minute}` : `${hour}:${value}`
    update('time', next)
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const saved = await onSave(values)
      if (!car && saved !== false) setValues(EMPTY_FORM)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="car-form panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{car ? 'Mise à jour' : 'Conducteur'}</span>
          <h2>{car ? 'Modifier ma voiture' : 'Je propose une voiture'}</h2>
        </div>
        {onCancel && <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer">×</button>}
      </div>
      <div className="form-grid">
        <label>
          Ville de départ
          <input
            required
            minLength="2"
            maxLength="80"
            value={values.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder="Ex. Lyon"
          />
        </label>
        <fieldset className="time-field">
          <legend>Heure de départ</legend>
          <div className="time-picker" role="group" aria-label="Heure de départ, format 24 heures">
            <label className="time-part">
              <span className="visually-hidden">Heure</span>
              <select
                value={hour}
                onChange={(event) => updateTimePart('hour', event.target.value)}
                aria-label="Heure"
              >
                {HOURS.map((value) => (
                  <option key={value} value={value}>{value} h</option>
                ))}
              </select>
            </label>
            <span className="time-separator" aria-hidden="true">:</span>
            <label className="time-part">
              <span className="visually-hidden">Minutes</span>
              <select
                value={minute}
                onChange={(event) => updateTimePart('minute', event.target.value)}
                aria-label="Minutes"
              >
                {MINUTES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
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

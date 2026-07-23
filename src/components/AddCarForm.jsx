import { useEffect, useState } from 'react'

const EMPTY_FORM = { city: '', time: '', seats: 4 }

export function AddCarForm({ car, onSave, onCancel }) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues(car ? { city: car.city, time: car.time, seats: car.seats } : EMPTY_FORM)
  }, [car])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
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
        {car && <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer">×</button>}
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
        <label>
          Heure
          <input required type="time" value={values.time} onChange={(event) => update('time', event.target.value)} />
        </label>
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
        {car && <button type="button" className="button button-ghost" onClick={onCancel}>Annuler</button>}
        <button className="button button-primary" disabled={submitting}>
          {submitting ? 'Enregistrement…' : car ? 'Enregistrer' : 'Proposer ma voiture'}
        </button>
      </div>
    </form>
  )
}

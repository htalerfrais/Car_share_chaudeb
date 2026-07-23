import { Waitlist } from './Waitlist'

export function CarCard({ car, user, userCarId, onJoin, onLeave, onEdit, onDelete, busy }) {
  const isDriver = car.driver.uid === user.uid
  const isPassenger = car.passengers.some((member) => member.uid === user.uid)
  const isWaiting = car.waitlist.some((member) => member.uid === user.uid)
  const occupied = car.passengers.length + 1
  const available = Math.max(0, car.seats - occupied)
  const isLinkedElsewhere = Boolean(userCarId && userCarId !== car.id)

  return (
    <article className={`car-card ${isDriver || isPassenger || isWaiting ? 'car-card-active' : ''}`}>
      <div className="car-card-top">
        <div>
          <span className="route-icon" aria-hidden="true">● ─── ◉</span>
          <h3>{car.city}</h3>
          <p>Départ à <strong>{car.time}</strong></p>
        </div>
        <div className={`seat-count ${available === 0 ? 'full' : ''}`}>
          <strong>{available}</strong>
          <span>{available === 1 ? 'place libre' : 'places libres'}</span>
        </div>
      </div>

      <div className="driver-line">
        <span className="avatar avatar-small">{car.driver.name.charAt(0).toUpperCase()}</span>
        <span><strong>{car.driver.name}</strong> conduit · {occupied}/{car.seats} places</span>
      </div>

      {car.passengers.length > 0 && (
        <div className="member-row" aria-label="Passagers">
          {car.passengers.map((member) => <span className="member-chip" key={member.uid}>{member.name}</span>)}
        </div>
      )}

      <Waitlist members={car.waitlist} />

      <div className="card-actions">
        {isDriver ? (
          <>
            <button className="button button-secondary" disabled={busy} onClick={() => onEdit(car)}>Modifier</button>
            <button className="button button-danger" disabled={busy} onClick={() => onDelete(car)}>Supprimer</button>
          </>
        ) : isPassenger || isWaiting ? (
          <button className="button button-secondary" disabled={busy} onClick={() => onLeave(car)}>
            {isWaiting ? 'Quitter la liste d’attente' : 'Quitter la voiture'}
          </button>
        ) : (
          <button className="button button-primary" disabled={busy || isLinkedElsewhere} onClick={() => onJoin(car)}>
            {available > 0 ? 'Rejoindre' : 'Rejoindre la liste d’attente'}
          </button>
        )}
      </div>
      {isLinkedElsewhere && <p className="card-note">Vous êtes déjà inscrit·e dans une autre voiture.</p>}
    </article>
  )
}

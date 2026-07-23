import { Avatar } from './Avatar'
import { CarVisual } from './CarVisual'
import { Trunk } from './Trunk'
import { Waitlist } from './Waitlist'

export function CarCard({
  car,
  user,
  userCarId,
  profiles,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onAddTrunk,
  onUpdateTrunk,
  onRemoveTrunk,
  busy,
}) {
  const isDriver = car.driver.uid === user.uid
  const isPassenger = car.passengers.some((member) => member.uid === user.uid)
  const isWaiting = car.waitlist.some((member) => member.uid === user.uid)
  const available = Math.max(0, car.seats - car.passengers.length - 1)
  const isLinkedElsewhere = Boolean(userCarId && userCarId !== car.id)
  const timeLabel = car.time.replace(':', ' h ')

  return (
    <article className={`car-card ${isDriver || isPassenger || isWaiting ? 'car-card-active' : ''}`}>
      <div className="car-card-top">
        <div>
          <span className="eyebrow">{timeLabel}</span>
          <h3>{car.city}</h3>
          <p className="driver-meta">
            <Avatar name={car.driver.name} photoURL={profiles[car.driver.uid]?.photoURL} size="xs" />
            <span><strong>{car.driver.name}</strong> au volant</span>
          </p>
        </div>
      </div>

      <CarVisual car={car} profiles={profiles} />
      <Waitlist members={car.waitlist} profiles={profiles} />

      <Trunk
        items={car.trunk}
        busy={busy}
        profiles={profiles}
        onAdd={(text) => onAddTrunk(car, text)}
        onUpdate={(itemId, text) => onUpdateTrunk(car, itemId, text)}
        onRemove={(itemId) => onRemoveTrunk(car, itemId)}
      />

      <div className="card-actions">
        {isDriver ? (
          <>
            <button className="button button-secondary" disabled={busy} onClick={() => onEdit(car)}>Modifier</button>
            <button className="button button-danger" disabled={busy} onClick={() => onDelete(car)}>Supprimer</button>
          </>
        ) : isPassenger || isWaiting ? (
          <button className="button button-secondary" disabled={busy} onClick={() => onLeave(car)}>
            {isWaiting ? 'Quitter la file' : 'Quitter la voiture'}
          </button>
        ) : (
          <button className="button button-primary" disabled={busy || isLinkedElsewhere} onClick={() => onJoin(car)}>
            {available > 0 ? 'Monter' : 'Rejoindre la file'}
          </button>
        )}
      </div>
      {isLinkedElsewhere && <p className="card-note">Vous êtes déjà dans une autre voiture.</p>}
    </article>
  )
}

export function GhostCarCard({ onClick, disabled }) {
  return (
    <button type="button" className="car-card ghost-car" onClick={onClick} disabled={disabled}>
      <div className="ghost-car-visual" aria-hidden="true">
        <div className="car-body ghost">
          <div className="car-hood" />
          <div className="car-cabin ghost-plus">+</div>
          <div className="car-trunk-zone"><span>Coffre</span></div>
        </div>
      </div>
      <strong>Ma voiture</strong>
      <span>Proposez une voiture et prenez le volant</span>
    </button>
  )
}

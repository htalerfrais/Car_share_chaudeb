import { CarCard, GhostCarCard } from './CarCard'

export function CarList({
  cars,
  canPropose,
  onPropose,
  leg,
  ...actions
}) {
  return (
    <div className="car-list">
      {canPropose && <GhostCarCard onClick={onPropose} disabled={actions.busy} leg={leg} />}
      {cars.map((car) => (
        <CarCard key={car.id} car={car} {...actions} />
      ))}
      {!cars.length && !canPropose && (
        <div className="empty-state panel">
          <span aria-hidden="true">◇</span>
          <h2>Aucune voiture pour {leg === 'retour' ? 'le retour' : 'l’aller'}</h2>
          <p>Soyez la première personne à en proposer une.</p>
        </div>
      )}
    </div>
  )
}

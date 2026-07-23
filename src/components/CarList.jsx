import { CarCard } from './CarCard'

export function CarList({ cars, ...actions }) {
  if (!cars.length) {
    return (
      <div className="empty-state panel">
        <span aria-hidden="true">◇</span>
        <h2>La route est encore libre</h2>
        <p>Soyez la première personne à proposer une voiture pour ce trajet.</p>
      </div>
    )
  }

  return (
    <div className="car-list">
      {cars.map((car) => <CarCard key={car.id} car={car} {...actions} />)}
    </div>
  )
}

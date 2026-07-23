import { Avatar } from './Avatar'
import { occupantsForCar, seatRowsForCapacity } from '../lib/seatLayout'

export function CarVisual({ car, profiles = {} }) {
  const occupants = occupantsForCar(car)
  const rows = seatRowsForCapacity(car.seats)
  const free = Math.max(0, car.seats - occupants.length)

  return (
    <div className="car-visual" aria-label={`Voiture ${car.seats} places, ${free} libres`}>
      <div className="car-body">
        <div className="car-hood" aria-hidden="true" />
        <div className="car-cabin">
          {rows.map((row, rowIndex) => (
            <div className={`seat-row seat-row-${row.length}`} key={`row-${rowIndex}`}>
              {row.map((seatIndex) => {
                const member = occupants[seatIndex]
                const isDriver = seatIndex === 0
                return (
                  <div
                    key={seatIndex}
                    className={`seat ${isDriver ? 'seat-driver' : ''} ${member ? 'seat-filled' : 'seat-empty'}`}
                  >
                    {member ? (
                      <Avatar
                        name={member.name}
                        photoURL={profiles[member.uid]?.photoURL}
                        size="seat"
                        title={isDriver ? `${member.name} (conducteur)` : member.name}
                      />
                    ) : (
                      <span className="seat-dot" aria-hidden="true" />
                    )}
                    {isDriver && <span className="seat-label">Volant</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="car-trunk-zone" aria-hidden="true">
          <span>Coffre</span>
        </div>
        <div className="car-wheel car-wheel-fl" aria-hidden="true" />
        <div className="car-wheel car-wheel-fr" aria-hidden="true" />
        <div className="car-wheel car-wheel-bl" aria-hidden="true" />
        <div className="car-wheel car-wheel-br" aria-hidden="true" />
      </div>
      <div className={`free-badge ${free === 0 ? 'is-full' : ''}`}>
        <strong>{free}</strong>
        <span>{free === 1 ? 'libre' : 'libres'}</span>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { demoCarService, firestoreCarService } from '../services/carService'

export function useCars(forceDemo = false) {
  const configuredMode = import.meta.env.VITE_DATA_MODE || 'firestore'
  const isDemo = forceDemo || configuredMode === 'demo'
  const service = useMemo(() => (isDemo ? demoCarService : firestoreCarService), [isDemo])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    return service.subscribe(
      (nextCars) => {
        setCars(nextCars)
        setLoading(false)
      },
      (subscriptionError) => {
        setError(subscriptionError)
        setLoading(false)
      },
    )
  }, [service])

  return { cars, loading, error, service, isDemo }
}

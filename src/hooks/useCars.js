import { useLayoutEffect, useMemo, useState } from 'react'
import { demoCarService, firestoreCarService } from '../services/carService'

export function useCars({ forceDemo = false, enabled = true } = {}) {
  const configuredMode = import.meta.env.VITE_DATA_MODE || 'firestore'
  const isDemo = forceDemo || configuredMode === 'demo'
  const service = useMemo(() => (isDemo ? demoCarService : firestoreCarService), [isDemo])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  useLayoutEffect(() => {
    if (!enabled) {
      setCars([])
      setError(null)
      setLoading(false)
      return undefined
    }

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
  }, [service, enabled])

  return { cars, loading, error, service, isDemo }
}

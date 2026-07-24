import { useCallback, useMemo, useState } from 'react'
import { AddCarForm } from './components/AddCarForm'
import { CarList } from './components/CarList'
import { Header } from './components/Header'
import { LoginScreen } from './components/LoginScreen'
import { ConfirmDialog, Toast } from './components/Toast'
import { UserDock } from './components/UserDock'
import { useAuth } from './contexts/AuthContext'
import { useCars } from './hooks/useCars'
import { useProfiles } from './hooks/useProfiles'
import { firebaseConfigured } from './lib/firebase'
import { LEG_ALLER, LEG_RETOUR, freeSeats } from './lib/trip'

function errorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Accès refusé par Firestore. Vérifiez la connexion Google et les règles déployées.'
  }
  if (error?.code === 'unavailable') return 'Service temporairement indisponible. Réessayez dans un instant.'
  if (error?.code === 'auth/popup-closed-by-user') return 'La fenêtre de connexion a été fermée.'
  return error?.message || 'Une erreur inattendue est survenue.'
}

function findUserCar(cars, user) {
  if (!user) return null
  return cars.find((car) =>
    [car.driver, ...car.passengers, ...car.waitlist].some((member) => member.uid === user.uid),
  ) || null
}

function ConfigurationScreen({ onUseDemo }) {
  return (
    <main className="config-layout">
      <section className="config-card">
        <span className="config-icon" aria-hidden="true">⚙</span>
        <div className="eyebrow">Configuration requise</div>
        <h1>Connectez votre projet Firebase</h1>
        <p>
          Les variables Firebase sont absentes ou le mode mock est incompatible avec les règles Firestore sécurisées.
          Copiez <code>.env.example</code> vers <code>.env.local</code>, renseignez votre application Web Firebase,
          puis utilisez <code>VITE_AUTH_MODE=google</code>.
        </p>
        <div className="config-actions">
          <button className="button button-primary" onClick={onUseDemo}>Découvrir l’interface en mode démo</button>
          <a className="button button-ghost" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
            Ouvrir Firebase
          </a>
        </div>
        <p className="fine-print">Le mode démo reste local à ce navigateur et ne remplace pas Firestore.</p>
      </section>
    </main>
  )
}

export default function App() {
  const { user, loading: authLoading, mode: authMode, enableDemoAuth } = useAuth()
  const configuredDataMode = import.meta.env.VITE_DATA_MODE || 'firestore'
  const [forceDemo, setForceDemo] = useState(false)
  const needsConfiguration =
    !forceDemo
    && (
      (configuredDataMode === 'firestore' && (!firebaseConfigured || authMode !== 'google'))
      || (configuredDataMode === 'demo' && authMode !== 'mock')
    )
  const { cars, loading, error, service, isDemo } = useCars(forceDemo || needsConfiguration)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editingCar, setEditingCar] = useState(null)
  const [deletingCar, setDeletingCar] = useState(null)
  const [proposing, setProposing] = useState(false)
  const [activeLeg, setActiveLeg] = useState(LEG_ALLER)

  const notify = useCallback((message, type = 'success') => setToast({ message, type }), [])

  const allerCars = useMemo(() => cars.filter((car) => car.leg === LEG_ALLER), [cars])
  const retourCars = useMemo(() => cars.filter((car) => car.leg === LEG_RETOUR), [cars])
  const visibleCars = activeLeg === LEG_RETOUR ? retourCars : allerCars

  const userCarAller = useMemo(() => findUserCar(allerCars, user), [allerCars, user])
  const userCarRetour = useMemo(() => findUserCar(retourCars, user), [retourCars, user])
  const userCar = activeLeg === LEG_RETOUR ? userCarRetour : userCarAller

  const freeAller = useMemo(() => allerCars.reduce((total, car) => total + freeSeats(car), 0), [allerCars])
  const freeRetour = useMemo(() => retourCars.reduce((total, car) => total + freeSeats(car), 0), [retourCars])

  const profileUids = useMemo(() => {
    const ids = []
    if (user?.uid) ids.push(user.uid)
    cars.forEach((car) => {
      ids.push(car.driver.uid)
      car.passengers.forEach((member) => ids.push(member.uid))
      car.waitlist.forEach((member) => ids.push(member.uid))
      car.trunk.forEach((item) => ids.push(item.authorUid))
    })
    return ids
  }, [cars, user])

  const { profiles, photoURL } = useProfiles({
    uids: profileUids,
    isDemo,
    currentUser: user,
  })

  async function run(action, successMessage) {
    setBusy(true)
    try {
      await action()
      if (successMessage) notify(successMessage)
      return true
    } catch (actionError) {
      notify(errorMessage(actionError), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  function switchLeg(nextLeg) {
    setActiveLeg(nextLeg)
    setProposing(false)
    setEditingCar(null)
  }

  if (authLoading) return <div className="loading-screen">Chargement…</div>

  if (needsConfiguration) {
    return (
      <>
        <Header isDemo={false} photoURL={null} />
        <ConfigurationScreen
          onUseDemo={() => {
            enableDemoAuth()
            setForceDemo(true)
          }}
        />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header isDemo={isDemo} photoURL={null} />
        <LoginScreen onError={(message) => notify(message, 'error')} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    )
  }

  return (
    <>
      <Header isDemo={isDemo} photoURL={photoURL} />
      <main className={`app-shell ${userCar ? '' : 'has-dock'}`}>
        <section className="dash-bar" aria-label="Tableau de bord">
          <div className="dash-stats">
            <div className="dash-stat">
              <strong>{freeAller}</strong>
              <span>places aller</span>
            </div>
            <div className="dash-stat">
              <strong>{freeRetour}</strong>
              <span>places retour</span>
            </div>
            <div className="dash-stat">
              <strong>{allerCars.length + retourCars.length}</strong>
              <span>voitures</span>
            </div>
          </div>
          <p className="dash-status">
            {userCarAller || userCarRetour
              ? [
                  userCarAller ? `Aller : ${userCarAller.city}` : null,
                  userCarRetour ? `Retour : ${userCarRetour.city}` : null,
                ].filter(Boolean).join(' · ')
              : 'Pas encore inscrit·e sur un trajet'}
          </p>
        </section>

        <div className="leg-tabs" role="tablist" aria-label="Sens du trajet">
          <button
            type="button"
            role="tab"
            aria-selected={activeLeg === LEG_ALLER}
            className={`leg-tab ${activeLeg === LEG_ALLER ? 'is-active' : ''}`}
            onClick={() => switchLeg(LEG_ALLER)}
          >
            Aller
            <span>{allerCars.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeLeg === LEG_RETOUR}
            className={`leg-tab ${activeLeg === LEG_RETOUR ? 'is-active' : ''}`}
            onClick={() => switchLeg(LEG_RETOUR)}
          >
            Retour
            <span>{retourCars.length}</span>
          </button>
        </div>

        {(proposing || editingCar) && (
          <AddCarForm
            car={editingCar}
            leg={activeLeg}
            onCancel={() => {
              setProposing(false)
              setEditingCar(null)
            }}
            onSave={async (values) => {
              if (editingCar) {
                const saved = await run(() => service.updateCar(user, editingCar.id, values), 'Voiture mise à jour.')
                if (saved) setEditingCar(null)
                return saved
              }
              const saved = await run(
                () => service.createCar(user, { ...values, leg: activeLeg }),
                'Votre voiture est proposée.',
              )
              if (saved) setProposing(false)
              return saved
            }}
          />
        )}

        <section className="cars-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{activeLeg === LEG_RETOUR ? 'Depuis Chaudebonne' : 'Vers Chaudebonne'}</span>
              <h2>{activeLeg === LEG_RETOUR ? 'Voitures retour' : 'Voitures aller'}</h2>
            </div>
            <span className="count-pill">
              {visibleCars.length} {visibleCars.length > 1 ? 'voitures' : 'voiture'}
            </span>
          </div>
          {loading ? (
            <div className="loading-panel panel">Chargement des voitures…</div>
          ) : error ? (
            <div className="error-panel panel" role="alert">
              <strong>Impossible de charger les voitures.</strong>
              <span>{errorMessage(error)}</span>
            </div>
          ) : (
            <CarList
              cars={visibleCars}
              leg={activeLeg}
              user={user}
              userCarId={userCar?.id}
              profiles={profiles}
              busy={busy}
              canPropose={!userCar && !proposing}
              onPropose={() => setProposing(true)}
              onJoin={(car) =>
                run(
                  () => service.joinCar(user, car.id),
                  car.passengers.length + 1 < car.seats ? 'Place réservée.' : 'Ajouté·e à la file d’attente.',
                )
              }
              onLeave={(car) => run(() => service.leaveCar(user, car.id), 'Vous avez quitté la voiture.')}
              onEdit={setEditingCar}
              onDelete={setDeletingCar}
              onAddTrunk={(car, text) => run(() => service.addTrunkItem(user, car.id, text), 'Ajouté au coffre.')}
              onUpdateTrunk={(car, itemId, text) => run(() => service.updateTrunkItem(user, car.id, itemId, text), 'Coffre mis à jour.')}
              onRemoveTrunk={(car, itemId) => run(() => service.removeTrunkItem(user, car.id, itemId), 'Objet retiré.')}
            />
          )}
        </section>
      </main>

      <UserDock
        user={user}
        photoURL={photoURL}
        visible={!userCar}
        leg={activeLeg}
      />

      <ConfirmDialog
        car={deletingCar}
        busy={busy}
        onCancel={() => setDeletingCar(null)}
        onConfirm={async () => {
          const deleted = await run(() => service.deleteCar(user, deletingCar.id), 'Voiture supprimée, membres libérés.')
          if (deleted) {
            setDeletingCar(null)
            setEditingCar(null)
          }
        }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

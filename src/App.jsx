import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { firestoreProfileService } from './services/profileService'

function errorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Accès refusé par Firestore. Vérifiez la connexion Google et les règles déployées (Firestore + Storage).'
  }
  if (error?.code === 'storage/unauthorized') {
    return 'Upload refusé. Déployez les règles Storage et reconnectez-vous.'
  }
  if (error?.code === 'unavailable') return 'Service temporairement indisponible. Réessayez dans un instant.'
  if (error?.code === 'auth/popup-closed-by-user') return 'La fenêtre de connexion a été fermée.'
  return error?.message || 'Une erreur inattendue est survenue.'
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

  const notify = useCallback((message, type = 'success') => setToast({ message, type }), [])
  const userCar = useMemo(
    () => user && cars.find((car) => [car.driver, ...car.passengers, ...car.waitlist].some((member) => member.uid === user.uid)),
    [cars, user],
  )

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

  const { profiles, photoURL, uploadPhoto } = useProfiles({
    uids: profileUids,
    isDemo,
    currentUser: user,
  })

  useEffect(() => {
    if (!user || isDemo || needsConfiguration) return undefined
    firestoreProfileService.ensureFromAuth(user).catch(() => {})
    return undefined
  }, [user, isDemo, needsConfiguration])

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
      <Header
        isDemo={isDemo}
        photoURL={photoURL}
        onChangePhoto={(file) => run(() => uploadPhoto(file), 'Photo de profil mise à jour.')}
      />
      <main className={`app-shell ${userCar ? '' : 'has-dock'}`}>
        <section className="hero">
          <div>
            <span className="eyebrow">Notre prochain trajet</span>
            <h1>Bonjour {user.firstName},<br />on part ensemble ?</h1>
          </div>
          <div className="hero-stat">
            <strong>{cars.reduce((total, car) => total + Math.max(0, car.seats - car.passengers.length - 1), 0)}</strong>
            <span>places disponibles</span>
          </div>
        </section>

        {(proposing || editingCar) && (
          <AddCarForm
            car={editingCar}
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
              const saved = await run(() => service.createCar(user, values), 'Votre voiture est proposée.')
              if (saved) setProposing(false)
              return saved
            }}
          />
        )}

        <section className="cars-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Les propositions</span>
              <h2>Voitures disponibles</h2>
            </div>
            <span className="count-pill">{cars.length} {cars.length > 1 ? 'voitures' : 'voiture'}</span>
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
              cars={cars}
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
        busy={busy}
        visible={!userCar}
        onChangePhoto={(file) => run(() => uploadPhoto(file), 'Photo de profil mise à jour.')}
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

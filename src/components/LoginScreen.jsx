import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function LoginScreen({ onError }) {
  const { mode, signIn } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await signIn(firstName)
    } catch (error) {
      onError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-card">
        <div className="eyebrow">Chaudebonne la guerre</div>
        <h1>Aller · Retour · Ensemble.</h1>
        <p>Proposez une voiture ou trouvez votre place pour l’aller et le retour.</p>
        <form onSubmit={handleSubmit}>
          {mode === 'mock' && (
            <label>
              Votre prénom
              <input
                autoFocus
                maxLength="40"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Ex. Camille"
              />
            </label>
          )}
          <button className="button button-primary button-wide" disabled={submitting}>
            {submitting ? 'Connexion…' : mode === 'google' ? 'Continuer avec Google' : 'Rejoindre le trajet'}
          </button>
        </form>
        {mode === 'mock' && <p className="fine-print">Profil local de démonstration, conservé sur cet appareil.</p>}
      </section>
    </main>
  )
}

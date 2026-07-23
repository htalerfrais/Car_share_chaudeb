import { useAuth } from '../contexts/AuthContext'

export function Header({ isDemo }) {
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="En voiture, accueil">
        <span className="brand-mark" aria-hidden="true">↗</span>
        <span>En voiture !</span>
      </a>
      {user && (
        <div className="profile">
          {isDemo && <span className="demo-badge">Mode démo</span>}
          <span className="avatar" aria-hidden="true">{user.firstName.charAt(0).toUpperCase()}</span>
          <span className="profile-name">{user.firstName}</span>
          <button className="button button-ghost button-small" onClick={signOut}>Déconnexion</button>
        </div>
      )}
    </header>
  )
}

import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './Avatar'

export function Header({ isDemo, photoURL }) {
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Chaudebonne la guerre, accueil">
        <span className="brand-mark" aria-hidden="true">↗</span>
        <span>Chaudebonne la guerre</span>
      </a>
      {user && (
        <div className="profile">
          {isDemo && <span className="demo-badge">Mode démo</span>}
          <Avatar name={user.firstName} photoURL={photoURL || user.photoURL} size="md" />
          <span className="profile-name">{user.firstName}</span>
          <button className="button button-ghost button-small" onClick={signOut}>Déconnexion</button>
        </div>
      )}
    </header>
  )
}

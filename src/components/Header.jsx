import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './Avatar'

export function Header({ isDemo, photoURL, onChangePhoto }) {
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
          <label className="profile-avatar-wrap" title="Changer la photo">
            <Avatar name={user.firstName} photoURL={photoURL || user.photoURL} size="md" />
            {onChangePhoto && (
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onChangePhoto(file)
                  event.target.value = ''
                }}
              />
            )}
          </label>
          <span className="profile-name">{user.firstName}</span>
          <button className="button button-ghost button-small" onClick={signOut}>Déconnexion</button>
        </div>
      )}
    </header>
  )
}

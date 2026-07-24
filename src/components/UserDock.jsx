import { Avatar } from './Avatar'

export function UserDock({ user, photoURL, visible, leg }) {
  if (!visible) return null

  return (
    <aside className="user-dock" aria-label="Votre personnage">
      <div className="user-dock-inner">
        <div className="dock-avatar-wrap">
          <Avatar name={user.firstName} photoURL={photoURL} size="lg" />
        </div>
        <div>
          <strong>{user.firstName}</strong>
          <p>
            {leg === 'retour'
              ? 'Pas encore de voiture pour le retour. Montez ou proposez la vôtre.'
              : 'Pas encore de voiture pour l’aller. Montez ou proposez la vôtre.'}
          </p>
        </div>
      </div>
    </aside>
  )
}

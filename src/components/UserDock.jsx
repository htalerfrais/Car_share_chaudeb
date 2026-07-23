import { Avatar } from './Avatar'

export function UserDock({ user, photoURL, visible }) {
  if (!visible) return null

  return (
    <aside className="user-dock" aria-label="Votre personnage">
      <div className="user-dock-inner">
        <div className="dock-avatar-wrap">
          <Avatar name={user.firstName} photoURL={photoURL} size="lg" />
        </div>
        <div>
          <strong>{user.firstName}</strong>
          <p>Vous n’êtes dans aucune voiture. Montez à bord ou proposez la vôtre.</p>
        </div>
      </div>
    </aside>
  )
}

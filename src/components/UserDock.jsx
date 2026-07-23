import { Avatar } from './Avatar'

export function UserDock({ user, photoURL, onChangePhoto, busy, visible }) {
  if (!visible) return null

  return (
    <aside className="user-dock" aria-label="Votre personnage">
      <div className="user-dock-inner">
        <label className="dock-avatar-wrap" title="Changer la photo de profil">
          <Avatar name={user.firstName} photoURL={photoURL} size="lg" />
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onChangePhoto(file)
              event.target.value = ''
            }}
          />
          <span className="dock-avatar-hint">Photo</span>
        </label>
        <div>
          <strong>{user.firstName}</strong>
          <p>Vous n’êtes dans aucune voiture. Montez à bord ou proposez la vôtre.</p>
        </div>
      </div>
    </aside>
  )
}

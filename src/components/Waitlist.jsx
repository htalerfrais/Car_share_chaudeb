import { Avatar } from './Avatar'

export function Waitlist({ members, profiles = {} }) {
  if (!members.length) return null
  return (
    <div className="waitlist-queue" aria-label={`Liste d’attente, ${members.length} personne${members.length > 1 ? 's' : ''}`}>
      <div className="waitlist-label">File d’attente</div>
      <div className="waitlist-track">
        {members.map((member, index) => (
          <div className="waitlist-person" key={member.uid} title={`${index + 1}. ${member.name}`}>
            <Avatar name={member.name} photoURL={profiles[member.uid]?.photoURL} size="sm" />
            <span>{member.name}</span>
          </div>
        ))}
      </div>
      <p className="waitlist-note">Pas de promotion auto si une place se libère.</p>
    </div>
  )
}

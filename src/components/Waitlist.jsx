export function Waitlist({ members }) {
  if (!members.length) return null
  return (
    <div className="waitlist">
      <strong>Liste d’attente · {members.length}</strong>
      <div className="member-row">
        {members.map((member, index) => (
          <span className="member-chip waiting" key={member.uid}>
            {index + 1}. {member.name}
          </span>
        ))}
      </div>
      <p>Les inscriptions restent en attente même si une place se libère.</p>
    </div>
  )
}

import { useState } from 'react'
import { Avatar } from './Avatar'

export function Trunk({ items = [], onAdd, onUpdate, onRemove, busy, profiles = {} }) {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')

  async function submitAdd(event) {
    event.preventDefault()
    if (!draft.trim()) return
    await onAdd(draft)
    setDraft('')
  }

  async function submitEdit(event) {
    event.preventDefault()
    if (!editingText.trim()) return
    await onUpdate(editingId, editingText)
    setEditingId(null)
    setEditingText('')
  }

  return (
    <div className="trunk">
      <div className="trunk-heading">
        <strong>Coffre</strong>
        <span>{items.length} objet{items.length === 1 ? '' : 's'}</span>
      </div>

      {items.length === 0 ? (
        <p className="trunk-empty">Rien pour l’instant — ajoutez ce que vous emmenez.</p>
      ) : (
        <ul className="trunk-list">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <form className="trunk-edit" onSubmit={submitEdit}>
                  <input
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    maxLength={200}
                    autoFocus
                  />
                  <button type="submit" className="button button-primary button-small" disabled={busy}>OK</button>
                  <button type="button" className="button button-ghost button-small" onClick={() => setEditingId(null)}>Annuler</button>
                </form>
              ) : (
                <div className="trunk-item">
                  <Avatar
                    name={item.authorName}
                    photoURL={profiles[item.authorUid]?.photoURL}
                    size="xs"
                  />
                  <div className="trunk-item-body">
                    <span>{item.text}</span>
                    <small>{item.authorName}</small>
                  </div>
                  <div className="trunk-item-actions">
                    <button
                      type="button"
                      className="button button-ghost button-small"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(item.id)
                        setEditingText(item.text)
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="button button-danger button-small"
                      disabled={busy}
                      onClick={() => onRemove(item.id)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="trunk-add" onSubmit={submitAdd}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex. 2 sacs, guitare…"
          maxLength={200}
          aria-label="Ajouter un objet dans le coffre"
        />
        <button type="submit" className="button button-secondary button-small" disabled={busy || !draft.trim()}>
          Ajouter
        </button>
      </form>
    </div>
  )
}

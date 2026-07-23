import { useEffect } from 'react'

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(onClose, 4500)
    return () => window.clearTimeout(timer)
  }, [onClose, toast])

  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Fermer la notification">×</button>
    </div>
  )
}

export function ConfirmDialog({ car, onCancel, onConfirm, busy }) {
  if (!car) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="modal-icon" aria-hidden="true">!</span>
        <h2 id="confirm-title">Supprimer cette voiture ?</h2>
        <p>
          La voiture au départ de <strong>{car.city}</strong> sera supprimée.
          Tous les passagers et membres de la liste d’attente seront libérés.
        </p>
        <div className="form-actions">
          <button className="button button-ghost" onClick={onCancel} disabled={busy}>Annuler</button>
          <button className="button button-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function Avatar({ name = '?', photoURL, size = 'md', className = '', title }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  const classes = ['avatar', `avatar-${size}`, className].filter(Boolean).join(' ')

  if (photoURL) {
    return (
      <img
        className={classes}
        src={photoURL}
        alt=""
        title={title || name}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span className={classes} title={title || name} aria-hidden="true">
      {initial}
    </span>
  )
}

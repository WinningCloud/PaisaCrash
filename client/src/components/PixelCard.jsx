export default function PixelCard({ title, accent, selected, onSelect, className = '', children, ...rest }) {
  const cls = [
    'pcard',
    accent && `pcard--${accent}`,
    onSelect && 'pcard--selectable',
    selected && 'pcard--selected',
    className,
  ].filter(Boolean).join(' ')

  const selectProps = onSelect
    ? {
        role: 'radio',
        'aria-checked': Boolean(selected),
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        },
      }
    : {}

  return (
    <section className={cls} {...selectProps} {...rest}>
      {title && <h2 className="pcard__title">{title}</h2>}
      {children}
    </section>
  )
}

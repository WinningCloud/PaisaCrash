export default function PixelButton({ variant = 'primary', size, block, className = '', type = 'button', children, ...rest }) {
  const cls = [
    'pbtn',
    variant !== 'primary' && `pbtn--${variant}`,
    size && `pbtn--${size}`,
    block && 'pbtn--block',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  )
}

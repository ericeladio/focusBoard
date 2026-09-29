// Marca de "esto vive solo en este dispositivo": el registro no pertenece a
// la cuenta que protege el passcode y no se sincroniza hasta que alguien lo
// suba a la cuenta.
function LocalChip({ className = '' }) {
  return (
    <span
      className={['chip-local', className].filter(Boolean).join(' ')}
      title="Solo en este dispositivo: no se sincroniza con la cuenta"
    >
      solo aquí
    </span>
  )
}

export default LocalChip

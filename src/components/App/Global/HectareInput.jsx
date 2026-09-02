import { sanitizeHectaresInput } from "../../../utils/hectares"
import "../../../styles/Global/HectareInput.css"

export default function HectareInput({
  value,
  onChange,
  name = "area_total",
  className = "",
  inputClassName = "",
  disabled = false,
  placeholder = "Ex.: 125,5",
  ...inputProps
}) {
  const handleChange = (event) => {
    const sanitizedValue = sanitizeHectaresInput(event.target.value)
    onChange?.({ target: { name, value: sanitizedValue } })
  }

  return (
    <div className={`hectare-input ${className}`.trim()}>
      <input
        {...inputProps}
        type="text"
        className={inputClassName}
        name={name}
        value={sanitizeHectaresInput(value)}
        onChange={handleChange}
        inputMode="decimal"
        autoComplete="off"
        maxLength={12}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Área total em hectares"
      />
      <span className="hectare-input__unit" aria-hidden="true">HA</span>
    </div>
  )
}

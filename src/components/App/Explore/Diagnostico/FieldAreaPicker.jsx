import { useEffect, useMemo, useRef, useState } from "react"

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()

export default function FieldAreaPicker({
  areas = [],
  selectedAreaId = "",
  customName = "",
  onSelect,
  onCustomNameChange,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const pickerRef = useRef(null)
  const selectedArea = areas.find((area) => area.id === selectedAreaId)

  useEffect(() => {
    setQuery(selectedArea?.name || customName || "")
  }, [customName, selectedArea?.name])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [])

  const suggestions = useMemo(() => {
    const term = normalize(query)
    return areas.filter((area) => !term || normalize(area.name).includes(term))
  }, [areas, query])

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 4)

  const exactMatch = suggestions.some((area) => normalize(area.name) === normalize(query))

  const handleInput = (event) => {
    const nextValue = event.target.value
    setQuery(nextValue)
    onCustomNameChange?.(nextValue)
    onSelect?.(nextValue.trim() ? "__custom__" : "")
    setShowAll(false)
    setIsOpen(true)
  }

  const chooseArea = (area) => {
    onSelect?.(area.id)
    onCustomNameChange?.("")
    setQuery(area.name || "")
    setShowAll(false)
    setIsOpen(false)
  }

  const clearValue = () => {
    onSelect?.("")
    onCustomNameChange?.("")
    setQuery("")
    setShowAll(false)
    setIsOpen(false)
  }

  return (
    <div ref={pickerRef} className={`field-area-picker ${className} ${isOpen ? "open" : ""}`}>
      <div className="field-area-picker__input-wrap">
        <input
          value={query}
          onChange={handleInput}
          onFocus={(event) => { setIsOpen(true); event.currentTarget.select() }}
          placeholder="Buscar ou digitar talhão"
          aria-label="Buscar ou digitar nome do talhão"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="field-area-suggestions"
          autoComplete="off"
          maxLength={60}
        />
      </div>

      {isOpen && (
        <div id="field-area-suggestions" className="field-area-picker__menu" role="listbox">
          {suggestions.length ? (
            <>
              <span className="field-area-picker__hint">{query.trim() ? "Sugestões encontradas" : "Talhões já desenhados no mapa"}</span>
              {visibleSuggestions.map((area) => (
                <button type="button" role="option" aria-selected={area.id === selectedAreaId} key={area.id} onClick={() => chooseArea(area)}>
                  <span className="material-symbols-outlined">landscape</span>
                  <span>{area.name || "Talhão sem nome"}</span>
                  {area.id === selectedAreaId && <span className="material-symbols-outlined field-area-picker__check">check</span>}
                </button>
              ))}
              {suggestions.length > 4 && !showAll && (
                <button type="button" className="field-area-picker__more" onClick={() => setShowAll(true)}>
                  <span className="material-symbols-outlined">expand_more</span>
                  Mostrar mais ({suggestions.length - 4})
                </button>
              )}
            </>
          ) : query ? <p className="field-area-picker__empty">Nenhum talhão mapeado com esse nome.</p> : <p className="field-area-picker__empty">Ainda não há talhões desenhados no mapa.</p>}

          {query.trim() && !exactMatch && (
            <button type="button" className="field-area-picker__manual" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined">edit_note</span>
              <span>Usar <strong>“{query.trim()}”</strong> como nome manual</span>
            </button>
          )}
          <button type="button" className="field-area-picker__skip" onClick={clearValue}>
            <span className="material-symbols-outlined">remove_circle_outline</span>
            Não vincular a um talhão agora
          </button>
        </div>
      )}
    </div>
  )
}

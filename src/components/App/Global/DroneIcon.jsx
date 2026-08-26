export default function DroneIcon({ className = "", alt = "" }) {
  return (
    <img
      className={`drone-icon-img ${className}`.trim()}
      src="/assets/icons/icon-droneP.png"
      alt={alt}
      aria-hidden={alt ? undefined : "true"}
    />
  )
}

export default function EspritLogo({ className = "", size = "md" }) {
  const sizes = { sm: 28, md: 40, lg: 56, xl: 72 }
  const h = sizes[size] || sizes.md

  return (
    <svg
      viewBox="0 0 220 70"
      height={h}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ESPRIT"
    >
      {/* Texte "espr" */}
      <text
        x="4" y="52"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="52"
        fill="#1A1A1A"
        letterSpacing="-1"
      >espr</text>

      {/* Texte "it" */}
      <text
        x="131" y="52"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="52"
        fill="#1A1A1A"
        letterSpacing="-1"
      >it</text>

      {/* Triangle rouge (play button) — intégré entre "r" et "i" */}
      <polygon
        points="126,8  126,48  158,28"
        fill="#E30613"
      />

      {/* Tagline */}
      <text
        x="5" y="67"
        fontFamily="Arial, sans-serif"
        fontWeight="400"
        fontSize="11"
        fill="#666666"
        letterSpacing="0.5"
      >Se former autrement</text>
    </svg>
  )
}

export function HonorisLogo({ className = "", height = 36 }) {
  return (
    <svg
      viewBox="0 0 200 60"
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Honoris United Universities"
    >
      <rect width="200" height="60" rx="6" fill="#7B1526"/>
      {/* Soleil stylisé */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180
        const cx = 28, cy = 30, r1 = 7, r2 = 13
        const x1 = cx + r1 * Math.cos(angle)
        const y1 = cy + r1 * Math.sin(angle)
        const x2 = cx + r2 * Math.cos(angle)
        const y2 = cy + r2 * Math.sin(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="1.5" />
      })}
      <circle cx="28" cy="30" r="5" fill="white"/>
      <text x="50" y="26" fontFamily="Georgia,serif" fontWeight="700" fontSize="13" fill="white" letterSpacing="2">HONORIS</text>
      <line x1="50" y1="30" x2="196" y2="30" stroke="white" strokeWidth="0.7" opacity="0.6"/>
      <text x="50" y="43" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="8" fill="white" letterSpacing="1.5">UNITED UNIVERSITIES</text>
    </svg>
  )
}

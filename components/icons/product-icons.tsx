interface IconProps {
  className?: string
  size?: number
}

// Ícone de Cana de Açúcar
export function SugarCaneIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7 3C7 3 8 4 8 6C8 8 7 9 7 9M10 2C10 2 11 3 11 5C11 7 10 8 10 8M13 3C13 3 14 4 14 6C14 8 13 9 13 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="6" y="9" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
      <rect x="6" y="13" width="8" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="17" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
      <path d="M10 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Ícone de Grão de Soja
export function SoybeanIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <ellipse cx="8" cy="9" rx="3.5" ry="5" fill="currentColor" opacity="0.2" />
      <ellipse cx="8" cy="9" rx="3.5" ry="5" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="15" cy="10" rx="3" ry="4.5" fill="currentColor" opacity="0.2" />
      <ellipse cx="15" cy="10" rx="3" ry="4.5" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="11" cy="16" rx="3.5" ry="4.5" fill="currentColor" opacity="0.2" />
      <ellipse cx="11" cy="16" rx="3.5" ry="4.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
      <circle cx="11" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

// Ícone de Milho
export function CornIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8 4C8 4 7 5 7 7L7 8C7 8 8 7 9 7C10 7 11 8 11 8L11 7C11 5 10 4 10 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 4C13 4 12 5 12 7L12 8C12 8 13 7 14 7C15 7 16 8 16 8L16 7C16 5 15 4 15 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8C8 8 8 8 8 8.5C8 10 8.5 18 9 20C9.2 21 10 22 11 22C12 22 12.8 21 13 20C13.5 18 14 10 14 8.5C14 8 14 8 14 8"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M8 8C8 8 8 8 8 8.5C8 10 8.5 18 9 20C9.2 21 10 22 11 22C12 22 12.8 21 13 20C13.5 18 14 10 14 8.5C14 8 14 8 14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="0.8" fill="currentColor" />
      <circle cx="12" cy="11" r="0.8" fill="currentColor" />
      <circle cx="9" cy="13" r="0.8" fill="currentColor" />
      <circle cx="11" cy="13" r="0.8" fill="currentColor" />
      <circle cx="13" cy="13" r="0.8" fill="currentColor" />
      <circle cx="10" cy="15" r="0.8" fill="currentColor" />
      <circle cx="12" cy="15" r="0.8" fill="currentColor" />
      <circle cx="9" cy="17" r="0.8" fill="currentColor" />
      <circle cx="11" cy="17" r="0.8" fill="currentColor" />
      <circle cx="13" cy="17" r="0.8" fill="currentColor" />
      <circle cx="10" cy="19" r="0.8" fill="currentColor" />
      <circle cx="12" cy="19" r="0.8" fill="currentColor" />
    </svg>
  )
}

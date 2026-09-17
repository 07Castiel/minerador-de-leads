import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Ensina ao merge os tokens da identidade definidos em globals.css, senão
// `shadow-glow` não substitui `shadow-sm` e `bg-gradient-primary` apaga `bg-*` de cor.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { shadow: ["glow"] },
    classGroups: { "bg-image": ["bg-gradient-primary", "bg-ember"] },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

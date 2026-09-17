export type Tema = "dark" | "light"

export const COOKIE_TEMA = "tema"

// Escuro é o padrão; só o valor "light" liga o tema claro.
export function lerTema(valor: string | undefined): Tema {
  return valor === "light" ? "light" : "dark"
}

// Links de contato a partir do telefone como veio do Google ("(88) 3611-1234",
// "+55 88 99999-9999"...). Tudo pensado para números brasileiros.

export function digitosDoTelefone(telefone: string | null | undefined): string {
  return (telefone ?? "").replace(/\D/g, "")
}

// Número com DDI 55, ou null se não parecer um telefone brasileiro válido.
export function telefoneInternacional(telefone: string | null | undefined): string | null {
  // Com "+" o DDI já veio explícito: só aceita se for do Brasil.
  const explicito = (telefone ?? "").trim().startsWith("+")
  let digitos = digitosDoTelefone(telefone)
  if (explicito && !digitos.startsWith("55")) return null
  if (digitos.startsWith("0")) digitos = digitos.replace(/^0+/, "")
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`
  if (!digitos.startsWith("55") || (digitos.length !== 12 && digitos.length !== 13)) return null
  return digitos
}

// Celular tem 9 dígitos depois do DDD e começa com 9. Fixo não tem WhatsApp
// na maioria dos casos (pode ter WhatsApp Business, mas não dá pra saber).
export function pareceCelular(telefone: string | null | undefined): boolean {
  const numero = telefoneInternacional(telefone)
  return numero !== null && numero.length === 13 && numero[4] === "9"
}

export function linkLigacao(telefone: string | null | undefined): string | null {
  const numero = telefoneInternacional(telefone)
  return numero ? `tel:+${numero}` : null
}

export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string): string | null {
  const numero = telefoneInternacional(telefone)
  if (!numero) return null
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""
  return `https://wa.me/${numero}${texto}`
}

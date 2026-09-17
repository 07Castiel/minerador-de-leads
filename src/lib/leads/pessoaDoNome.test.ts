import { describe, expect, it } from "vitest"

import { pessoaDoNome } from "@/lib/leads/pessoaDoNome"

// Nomes reais do banco (Google Maps, busca "Advogado").
describe("pessoaDoNome", () => {
  it.each([
    // título
    ["Advogado Criminalista Dr.Iury Ribeiro", "Iury Ribeiro"],
    ["Advogado Revisional Fortaleza (Dr. Vicente Quesado)", "Vicente Quesado"],
    ["Dra Andressa Lima | Advogado em Fortaleza | Registro de Marcas", "Andressa Lima"],
    ["Dra.Adriana Melo Alcantarino Advocacia | Fortaleza | Eusébio", "Adriana Melo"],
    ["Dr. Joana D'arc Advogado Criminalista", "Joana D'arc"],
    ["Dr. Fernando - Advogado Bancário - Revisão de Juros", "Fernando"],
    ["ESCRITÓRIO DE ADVOCACIA E CONSULTORIA JURÍDICA DR. RODRIGO PARENTE", "Rodrigo Parente"],
    ["Escritório Dra. Virgínia Carneiro", "Virgínia Carneiro"],
    // nome colado no sufixo
    ["LUIZ CARLOS SILVA ADVOCACIA", "Luiz Carlos"],
    ["Antônio Carlos Matias Advogado", "Antônio Carlos"],
    ["Ana Júlia Duarte Advocacia", "Ana Júlia"],
    ["Igor Gurgel Advogados Associados", "Igor Gurgel"],
    ["Helton Mesquita & Advogados Associados", "Helton Mesquita"],
    ["Daniel Pereira Lima – Advogado", "Daniel Pereira"],
    ["Juliana Lima | Advogada | Direito da Saúde - Fortaleza - CE", "Juliana Lima"],
    ["GILSON FONTENELE SOCIEDADE INDIVIDUAL DE ADVOCACIA", "Gilson Fontenele"],
    ["THB Advocacia - Tasso Henrique Brandão Advocacia", "Tasso Henrique"],
    ["⚖️Tíssia Cavalcanti - Advocacia de Família e Sucessões | Fortaleza - CE", "Tíssia Cavalcanti"],
    ["Hugo Gondim Advocacia-Especialista em DireitoTrabalhista, Previdenciário", "Hugo Gondim"],
    // primeiro nome conhecido depois do sufixo ou sozinho
    ["Advogado Luciano Torres Filho", "Luciano Torres"],
    ["Advocacia Trabalhista e Previdenciária João Simplício", "João Simplício"],
    ["ADVOGADO DAS FAMÍLIAS | EDUARDO ALBUQUERQUE", "Eduardo Albuquerque"],
    ["Advogado Trabalhista em Fortaleza | Hélio Nascimento Jr", "Hélio Nascimento"],
    ["Luis Carlos Linhares", "Luis Carlos"],
    ["Viviane Pinheiro", "Viviane Pinheiro"],
  ])("%s → %s", (nome, pessoa) => {
    expect(pessoaDoNome(nome)).toBe(pessoa)
  })

  it.each([
    "Azevedo & Azevedo",
    "Escritório da empresa",
    "Advocacia Central",
    "Castro & Barboza Sociedade de Advogados",
    "Garcia, Lima & Becco Advogados - Advogado Fortaleza - Advogado Trabalhista",
    "Loiola & Siqueira - Advogado Trabalhista",
    "Oséas Rodrigues & Nogueira ADVOGADO CRIMINALISTA - ADVOGADO EM SOBRAL",
    "Machado e Fontenele Advocacia",
    "COSTA E MOURA ADVOGADOS",
    "Escritório de advocacia Parente e Parente Sociedade de Advogados",
    "FORTALEZA ADVOGADOS ASSOCIADOS",
    "Mendes Advogados Associados",
    "Costa Filho Advogados",
    "BMI Advocacia",
    "AdvogaBrasil",
    "R Feitosa Group",
    "N Carvalho",
    "Neto Linhares",
    "Samarony Sousa",
  ])("sem pessoa: %s", (nome) => {
    expect(pessoaDoNome(nome)).toBeNull()
  })

  it("nunca devolve só sobrenome", () => {
    expect(pessoaDoNome("Mendes & Advogados Associados")).toBeNull()
    expect(pessoaDoNome("Silva Costa Advocacia")).toBeNull()
  })

  it("acento decomposto (como veio do banco) não atrapalha", () => {
    const decomposto = "Joao Felipe Gurjão | Advogado | Direito Médico | Fortaleza".normalize("NFD")
    expect(pessoaDoNome(decomposto)).toBe("Joao Felipe")
  })

  it("conector dentro do nome conta como parte dele", () => {
    expect(pessoaDoNome("Dra. Maria de Fátima Advocacia")).toBe("Maria de Fátima")
  })
})

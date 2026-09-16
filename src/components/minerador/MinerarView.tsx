"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { BuscasTable } from "@/components/minerador/BuscasTable"
import { NovaBuscaForm } from "@/components/minerador/NovaBuscaForm"
import { useBuscas, useIniciarBusca } from "@/hooks/useBuscas"
import type { NovaBusca } from "@/lib/minerador/regras"

export function MinerarView() {
  const router = useRouter()
  const { data: buscas, isLoading, error } = useBuscas()
  const iniciar = useIniciarBusca()

  function handleSubmit(nova: NovaBusca) {
    iniciar.mutate(nova, {
      onSuccess: (busca) => {
        if (busca.status === "erro") {
          toast.error(busca.erro ?? "Não foi possível iniciar a busca.")
        } else {
          toast.success("Busca iniciada. Os resultados aparecem assim que ficarem prontos.")
        }
        router.push(`/buscar/${busca.id}`)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Buscar leads</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um nicho e um local. Os resultados ficam guardados e você decide quais vão para o CRM.
        </p>
      </div>

      <NovaBuscaForm enviando={iniciar.isPending} onSubmit={handleSubmit} />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Buscas anteriores</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando buscas...</p>}
        {error && <p className="text-sm text-destructive">Erro ao carregar buscas: {error.message}</p>}
        {buscas && <BuscasTable buscas={buscas} />}
      </div>
    </div>
  )
}

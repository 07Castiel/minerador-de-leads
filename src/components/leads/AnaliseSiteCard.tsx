"use client"

import type { ReactNode } from "react"
import { GlobeIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAnalisarSite } from "@/hooks/useLead"
import { ROTULO_STATUS_SITE, rodapeAntigo, type RespostaAnaliseDeSite, type StatusSite } from "@/lib/leads/analiseSite"
import { formatarDataHora } from "@/lib/minerador/formatacao"
import { classificarLink } from "@/lib/leads/presencaDigital"
import { cn } from "@/lib/utils"
import type { Lead } from "@/types/lead"

const segundos = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

const STATUS_COM_PROBLEMA: StatusSite[] = ["fora_do_ar", "sem_conteudo", "certificado_invalido", "nao_e_site"]

// Avisa o que ficou de fora da análise (velocidade sem chave, limite do Google...).
export function avisarResultadoDaAnalise(resposta: RespostaAnaliseDeSite) {
  if (resposta.velocidade === "sem_chave") {
    toast.info("Site analisado. A velocidade no celular não foi medida: falta a chave do PageSpeed.")
  } else if (resposta.velocidade === "falhou") {
    toast.warning(`Site analisado, mas sem a velocidade no celular. ${resposta.avisoVelocidade ?? ""}`.trim())
  } else {
    toast.success("Site analisado.")
  }
}

function SimNao({ label, valor, bomQuando }: { label: string; valor: boolean | null; bomQuando: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm", valor !== null && valor !== bomQuando && "font-medium text-destructive")}>
        {valor === null ? "—" : valor ? "Sim" : "Não"}
      </dd>
    </div>
  )
}

function Linha({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function AnaliseSiteCard({ lead }: { lead: Lead }) {
  const analisar = useAnalisarSite()
  const analisavel = classificarLink(lead.site_url)?.tipo === "site"
  // Sem link de site próprio e nunca analisado: não há o que mostrar.
  if (!analisavel && !lead.site_status) return null

  const status = lead.site_status as StatusSite | null
  const nota = lead.site_nota_celular

  function rodar() {
    analisar.mutate(lead.id, {
      onSuccess: avisarResultadoDaAnalise,
      onError: (err) => toast.error(`Não deu pra analisar o site: ${err.message}`),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Análise do site</CardTitle>
        {analisavel && (
          <Button size="sm" variant={status ? "outline" : "default"} disabled={analisar.isPending} onClick={rodar}>
            {analisar.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : status ? (
              <RefreshCwIcon />
            ) : (
              <GlobeIcon />
            )}
            {analisar.isPending ? "Analisando..." : status ? "Analisar de novo" : "Analisar site"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {analisar.isPending && (
          <p className="text-sm text-muted-foreground">
            Abrindo o site e medindo no celular. Pode levar até 1 minuto.
          </p>
        )}

        {!status ? (
          !analisar.isPending && (
            <p className="text-sm text-muted-foreground">
              Confere se o site está no ar, se é seguro, se funciona bem no celular e se tem botão de
              WhatsApp. Não gasta crédito.
            </p>
          )
        ) : (
          <>
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  STATUS_COM_PROBLEMA.includes(status) && "text-destructive"
                )}
              >
                {ROTULO_STATUS_SITE[status] ?? status}
              </p>
              {lead.site_detalhe && <p className="text-sm text-muted-foreground">{lead.site_detalhe}</p>}
            </div>

            {status === "ok" && (
              <dl className="grid grid-cols-2 gap-3">
                <Linha label="Nota no celular (PageSpeed)">
                  {nota === null ? (
                    <span className="text-muted-foreground">Não medida</span>
                  ) : (
                    <span className={cn(nota < 50 && "font-medium text-destructive")}>{nota} de 100</span>
                  )}
                </Linha>
                <Linha label="Conteúdo aparece em">
                  {lead.site_carregamento_ms === null ? "—" : `${segundos.format(lead.site_carregamento_ms / 1000)} s`}
                </Linha>
                <SimNao label="Ajustado ao celular" valor={lead.site_responsivo} bomQuando />
                <SimNao label="HTTPS (cadeado)" valor={lead.site_https} bomQuando />
                <SimNao label="Botão de WhatsApp" valor={lead.site_tem_whatsapp} bomQuando />
                <Linha label="Feito com">
                  {lead.site_plataforma ?? "—"}
                  {lead.site_dominio_gratuito && (
                    <span className="font-medium text-destructive"> (endereço gratuito)</span>
                  )}
                </Linha>
                <Linha label="Ano no rodapé">
                  <span
                    className={cn(
                      rodapeAntigo(lead.site_ano_rodape, lead.site_analisado_em) && "font-medium text-destructive"
                    )}
                  >
                    {lead.site_ano_rodape ?? "—"}
                  </span>
                </Linha>
              </dl>
            )}

            {lead.site_url_final &&
              lead.site_url_final !== lead.site_url &&
              /^https?:\/\//i.test(lead.site_url_final) && (
              <p className="truncate text-sm text-muted-foreground">
                Endereço final:{" "}
                <a
                  href={lead.site_url_final}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {lead.site_url_final.replace(/^https?:\/\/(www\.)?/i, "")}
                </a>
              </p>
            )}

            {lead.site_analisado_em && (
              <p className="text-xs text-muted-foreground">Analisado em {formatarDataHora(lead.site_analisado_em)}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import Link from "next/link"
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react"

import { AnaliseSiteCard } from "@/components/leads/AnaliseSiteCard"
import { ContatoBotoes } from "@/components/leads/ContatoBotoes"
import { EtapaBadge } from "@/components/leads/EtapaBadge"
import { LeadEditForm } from "@/components/leads/LeadEditForm"
import { MotivosChips } from "@/components/leads/MotivosChips"
import { RetornoBadge } from "@/components/leads/RetornoBadge"
import { TemperaturaBadge } from "@/components/leads/TemperaturaBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLead } from "@/hooks/useLead"
import { motivosDoLead } from "@/lib/leads/motivos"

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  )
}

export function LeadDetail({ id }: { id: string }) {
  const { data: lead, isLoading, error } = useLead(id)

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">Erro ao carregar lead: {error.message}</p>
  if (!lead) return <p className="text-sm text-muted-foreground">Lead não encontrado.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm" aria-label="Voltar para o CRM">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{lead.nome}</h1>
              <TemperaturaBadge temperatura={lead.temperatura} />
              {lead.no_funil ? (
                <EtapaBadge etapa={lead.etapa} />
              ) : (
                <span className="text-xs text-muted-foreground">Fora do CRM</span>
              )}
              <RetornoBadge proximoContato={lead.proximo_contato} />
            </div>
            <p className="text-sm text-muted-foreground">
              {[lead.categoria, lead.cidade].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ContatoBotoes lead={lead} />
          {lead.maps_url && (
            <Button asChild variant="outline" size="sm">
              <a href={lead.maps_url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Google Maps
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por que esse lead</CardTitle>
            </CardHeader>
            <CardContent>
              {motivosDoLead(lead).length > 0 ? (
                <MotivosChips lead={lead} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum sinal forte de oportunidade nos dados do Google.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Categoria" value={lead.categoria} />
                <Field label="Score" value={lead.score} />
                <Field label="Telefone" value={lead.telefone} />
                <Field label="Origem" value={lead.origem} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Cidade" value={lead.cidade} />
                <Field label="Bairro" value={lead.bairro} />
                <div className="col-span-2">
                  <Field label="Endereço" value={lead.endereco} />
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presença digital e avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field
                  label="Tem site próprio?"
                  value={lead.tem_site === null ? "Desconhecido" : lead.tem_site ? "Sim" : "Não"}
                />
                <div>
                  <dt className="text-sm text-muted-foreground">Link no Google</dt>
                  <dd className="truncate text-sm">
                    {lead.site_url ? (
                      <a
                        href={/^https?:\/\//i.test(lead.site_url) ? lead.site_url : `https://${lead.site_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {lead.site_url.replace(/^https?:\/\/(www\.)?/i, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <Field
                  label="Perfil Google reivindicado?"
                  value={
                    lead.perfil_reivindicado === null ? null : lead.perfil_reivindicado ? "Sim" : "Não"
                  }
                />
                <Field label="Fotos no Google" value={lead.fotos_count} />
                <Field label="Instagram" value={lead.instagram_handle ? `@${lead.instagram_handle}` : null} />
                <Field label="Seguidores" value={lead.instagram_seguidores} />
                <Field label="Último post (dias)" value={lead.instagram_ultimo_post_dias} />
                <Field label="Nota no Google" value={lead.google_rating} />
                <Field label="Nº de avaliações" value={lead.google_avaliacoes_count} />
                <Field label="Avaliações sem resposta" value={lead.google_avaliacoes_sem_resposta} />
              </dl>
            </CardContent>
          </Card>

        </div>

        <div className="flex flex-col gap-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Recria o formulário só quando os campos dele mudam fora dele: analisar o
                  site (que muda atualizado_em) não apaga o que está sendo digitado. */}
              <LeadEditForm
                key={[lead.id, lead.etapa, lead.motivo_perda, lead.observacoes, lead.proximo_contato].join("|")}
                lead={lead}
              />
            </CardContent>
          </Card>

          <AnaliseSiteCard lead={lead} />
        </div>
      </div>
    </div>
  )
}

import { Link, useParams } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"

import { useLead } from "@/hooks/useLead"
import { LeadEditForm } from "@/components/leads/LeadEditForm"
import { StatusBadge } from "@/components/leads/StatusBadge"
import { TemperaturaBadge } from "@/components/leads/TemperaturaBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams()
  const { data: lead, isLoading, error } = useLead(id)

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">Erro ao carregar lead: {error.message}</p>
  if (!lead) return <p className="text-sm text-muted-foreground">Lead não encontrado.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/leads">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{lead.nome}</h1>
          <TemperaturaBadge temperatura={lead.temperatura} />
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
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
                <Field label="Endereço" value={lead.endereco} />
                <Field
                  label="Coordenadas"
                  value={
                    lead.latitude != null && lead.longitude != null
                      ? `${lead.latitude}, ${lead.longitude}`
                      : null
                  }
                />
                {lead.maps_url && (
                  <div className="col-span-2">
                    <dt className="text-sm text-muted-foreground">Google Maps</dt>
                    <dd className="text-sm">
                      <a
                        href={lead.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        Abrir no Maps
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presença digital</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Tem site?" value={lead.tem_site === null ? "Desconhecido" : lead.tem_site ? "Sim" : "Não"} />
                <Field label="Instagram" value={lead.instagram_handle} />
                <Field label="Seguidores" value={lead.instagram_seguidores} />
                <Field label="Último post (dias)" value={lead.instagram_ultimo_post_dias} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Nota Google" value={lead.google_rating} />
                <Field label="Nº avaliações" value={lead.google_avaliacoes_count} />
                <Field label="Sem resposta" value={lead.google_avaliacoes_sem_resposta} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de prospecção</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadEditForm lead={lead} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Gerado a partir do banco (supabase gen types) — projeto minerador-leads.
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      buscas: {
        Row: {
          apify_dataset_id: string | null
          apify_run_id: string | null
          atualizado_em: string
          bairro: string | null
          cidade: string
          concluido_em: string | null
          criado_em: string
          criado_por: string | null
          custo_estimado_usd: number | null
          erro: string | null
          filtros: Json
          id: string
          ignorados: number | null
          ja_existiam: number | null
          max_resultados: number
          nicho: string
          novos: number | null
          org_id: string
          status: string
          total_encontrados: number | null
          uf: string
        }
        Insert: {
          apify_dataset_id?: string | null
          apify_run_id?: string | null
          atualizado_em?: string
          bairro?: string | null
          cidade: string
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          custo_estimado_usd?: number | null
          erro?: string | null
          filtros?: Json
          id?: string
          ignorados?: number | null
          ja_existiam?: number | null
          max_resultados: number
          nicho: string
          novos?: number | null
          org_id: string
          status?: string
          total_encontrados?: number | null
          uf: string
        }
        Update: {
          apify_dataset_id?: string | null
          apify_run_id?: string | null
          atualizado_em?: string
          bairro?: string | null
          cidade?: string
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          custo_estimado_usd?: number | null
          erro?: string | null
          filtros?: Json
          id?: string
          ignorados?: number | null
          ja_existiam?: number | null
          max_resultados?: number
          nicho?: string
          novos?: number | null
          org_id?: string
          status?: string
          total_encontrados?: number | null
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "buscas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      buscas_leads: {
        Row: {
          busca_id: string
          lead_id: string
          org_id: string
        }
        Insert: {
          busca_id: string
          lead_id: string
          org_id: string
        }
        Update: {
          busca_id?: string
          lead_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buscas_leads_busca_id_fkey"
            columns: ["busca_id"]
            isOneToOne: false
            referencedRelation: "buscas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buscas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buscas_leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          arquivo_nome: string | null
          atualizados: number | null
          created_at: string
          erros: number | null
          id: string
          ignorados: number | null
          novos: number | null
          org_id: string
          origem: string | null
          total_linhas: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          atualizados?: number | null
          created_at?: string
          erros?: number | null
          id?: string
          ignorados?: number | null
          novos?: number | null
          org_id?: string
          origem?: string | null
          total_linhas?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          atualizados?: number | null
          created_at?: string
          erros?: number | null
          id?: string
          ignorados?: number | null
          novos?: number | null
          org_id?: string
          origem?: string | null
          total_linhas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atualizado_em: string
          bairro: string | null
          categoria: string | null
          cidade: string | null
          criado_em: string
          endereco: string | null
          etapa: string
          etapa_atualizada_em: string | null
          fotos_count: number | null
          google_avaliacoes_count: number | null
          google_avaliacoes_sem_resposta: number | null
          google_rating: number | null
          id: string
          instagram_handle: string | null
          instagram_seguidores: number | null
          instagram_ultimo_post_dias: number | null
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          motivo_perda: string | null
          no_funil: boolean
          nome: string
          observacoes: string | null
          org_id: string
          origem: string | null
          perfil_reivindicado: boolean | null
          place_id: string | null
          proximo_contato: string | null
          score: number | null
          site_analisado_em: string | null
          site_ano_rodape: number | null
          site_carregamento_ms: number | null
          site_detalhe: string | null
          site_dominio_gratuito: boolean | null
          site_https: boolean | null
          site_nota_celular: number | null
          site_plataforma: string | null
          site_responsivo: boolean | null
          site_status: string | null
          site_tem_whatsapp: boolean | null
          site_url: string | null
          site_url_final: string | null
          telefone: string | null
          tem_descricao: boolean | null
          tem_horario: boolean | null
          tem_site: boolean | null
          temperatura: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          categoria?: string | null
          cidade?: string | null
          criado_em?: string
          endereco?: string | null
          etapa?: string
          etapa_atualizada_em?: string | null
          fotos_count?: number | null
          google_avaliacoes_count?: number | null
          google_avaliacoes_sem_resposta?: number | null
          google_rating?: number | null
          id?: string
          instagram_handle?: string | null
          instagram_seguidores?: number | null
          instagram_ultimo_post_dias?: number | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          motivo_perda?: string | null
          no_funil?: boolean
          nome: string
          observacoes?: string | null
          org_id?: string
          origem?: string | null
          perfil_reivindicado?: boolean | null
          place_id?: string | null
          proximo_contato?: string | null
          score?: number | null
          site_analisado_em?: string | null
          site_ano_rodape?: number | null
          site_carregamento_ms?: number | null
          site_detalhe?: string | null
          site_dominio_gratuito?: boolean | null
          site_https?: boolean | null
          site_nota_celular?: number | null
          site_plataforma?: string | null
          site_responsivo?: boolean | null
          site_status?: string | null
          site_tem_whatsapp?: boolean | null
          site_url?: string | null
          site_url_final?: string | null
          telefone?: string | null
          tem_descricao?: boolean | null
          tem_horario?: boolean | null
          tem_site?: boolean | null
          temperatura?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          categoria?: string | null
          cidade?: string | null
          criado_em?: string
          endereco?: string | null
          etapa?: string
          etapa_atualizada_em?: string | null
          fotos_count?: number | null
          google_avaliacoes_count?: number | null
          google_avaliacoes_sem_resposta?: number | null
          google_rating?: number | null
          id?: string
          instagram_handle?: string | null
          instagram_seguidores?: number | null
          instagram_ultimo_post_dias?: number | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          motivo_perda?: string | null
          no_funil?: boolean
          nome?: string
          observacoes?: string | null
          org_id?: string
          origem?: string | null
          perfil_reivindicado?: boolean | null
          place_id?: string | null
          proximo_contato?: string | null
          score?: number | null
          site_analisado_em?: string | null
          site_ano_rodape?: number | null
          site_carregamento_ms?: number | null
          site_detalhe?: string | null
          site_dominio_gratuito?: boolean | null
          site_https?: boolean | null
          site_nota_celular?: number | null
          site_plataforma?: string | null
          site_responsivo?: boolean | null
          site_status?: string | null
          site_tem_whatsapp?: boolean | null
          site_url?: string | null
          site_url_final?: string | null
          telefone?: string | null
          tem_descricao?: boolean | null
          tem_horario?: boolean | null
          tem_site?: boolean | null
          temperatura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          criado_em: string
          org_id: string
          papel: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          org_id: string
          papel?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          org_id?: string
          papel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_mensagem: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          ordem: number
          org_id: string
          texto: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          org_id?: string
          texto: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          org_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_mensagem_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_score_lead: {
        Args: { l: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

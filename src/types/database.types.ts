export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      imports: {
        Row: {
          arquivo_nome: string | null
          atualizados: number | null
          created_at: string | null
          erros: number | null
          id: string
          ignorados: number | null
          novos: number | null
          origem: string | null
          total_linhas: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          atualizados?: number | null
          created_at?: string | null
          erros?: number | null
          id?: string
          ignorados?: number | null
          novos?: number | null
          origem?: string | null
          total_linhas?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          atualizados?: number | null
          created_at?: string | null
          erros?: number | null
          id?: string
          ignorados?: number | null
          novos?: number | null
          origem?: string | null
          total_linhas?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          categoria: string | null
          cidade: string | null
          criado_em: string | null
          endereco: string | null
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
          nome: string
          observacoes: string | null
          origem: string | null
          score: number | null
          status: string | null
          telefone: string | null
          tem_site: boolean | null
          temperatura: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          categoria?: string | null
          cidade?: string | null
          criado_em?: string | null
          endereco?: string | null
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
          nome: string
          observacoes?: string | null
          origem?: string | null
          score?: number | null
          status?: string | null
          telefone?: string | null
          tem_site?: boolean | null
          temperatura?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          categoria?: string | null
          cidade?: string | null
          criado_em?: string | null
          endereco?: string | null
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
          nome?: string
          observacoes?: string | null
          origem?: string | null
          score?: number | null
          status?: string | null
          telefone?: string | null
          tem_site?: boolean | null
          temperatura?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      leads_prioridade: {
        Row: {
          bairro: string | null
          categoria: string | null
          instagram_handle: string | null
          nome: string | null
          score: number | null
          status: string | null
          telefone: string | null
          temperatura: string | null
        }
        Insert: {
          bairro?: string | null
          categoria?: string | null
          instagram_handle?: string | null
          nome?: string | null
          score?: number | null
          status?: string | null
          telefone?: string | null
          temperatura?: string | null
        }
        Update: {
          bairro?: string | null
          categoria?: string | null
          instagram_handle?: string | null
          nome?: string | null
          score?: number | null
          status?: string | null
          telefone?: string | null
          temperatura?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_score_lead: {
        Args: {
          p_google_avaliacoes_count: number
          p_google_avaliacoes_sem_resposta: number
          p_instagram_seguidores: number
          p_instagram_ultimo_post_dias: number
          p_tem_site: boolean
        }
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

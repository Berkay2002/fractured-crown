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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          player_id: number
          room_id: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          player_id: number
          room_id: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          player_id?: number
          room_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: number
          metadata: Json | null
          room_id: number
          round_id: number | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: never
          metadata?: Json | null
          room_id: number
          round_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: never
          metadata?: Json | null
          room_id?: number
          round_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          active_power: Database["public"]["Enums"]["executive_power"] | null
          current_herald_id: number | null
          current_lord_commander_id: number | null
          current_phase: Database["public"]["Enums"]["game_phase"]
          election_tracker: number
          id: number
          last_elected_herald_id: number | null
          last_elected_lord_commander_id: number | null
          loyalist_edicts_passed: number
          room_id: number
          shadow_edicts_passed: number
          special_election_herald_pointer: number | null
          updated_at: string
          veto_unlocked: boolean
          winner: Database["public"]["Enums"]["win_condition"] | null
        }
        Insert: {
          active_power?: Database["public"]["Enums"]["executive_power"] | null
          current_herald_id?: number | null
          current_lord_commander_id?: number | null
          current_phase?: Database["public"]["Enums"]["game_phase"]
          election_tracker?: number
          id?: never
          last_elected_herald_id?: number | null
          last_elected_lord_commander_id?: number | null
          loyalist_edicts_passed?: number
          room_id: number
          shadow_edicts_passed?: number
          special_election_herald_pointer?: number | null
          updated_at?: string
          veto_unlocked?: boolean
          winner?: Database["public"]["Enums"]["win_condition"] | null
        }
        Update: {
          active_power?: Database["public"]["Enums"]["executive_power"] | null
          current_herald_id?: number | null
          current_lord_commander_id?: number | null
          current_phase?: Database["public"]["Enums"]["game_phase"]
          election_tracker?: number
          id?: never
          last_elected_herald_id?: number | null
          last_elected_lord_commander_id?: number | null
          loyalist_edicts_passed?: number
          room_id?: number
          shadow_edicts_passed?: number
          special_election_herald_pointer?: number | null
          updated_at?: string
          veto_unlocked?: boolean
          winner?: Database["public"]["Enums"]["win_condition"] | null
        }
        Relationships: [
          {
            foreignKeyName: "game_state_current_herald_id_fkey"
            columns: ["current_herald_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_current_lord_commander_id_fkey"
            columns: ["current_lord_commander_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_last_elected_herald_id_fkey"
            columns: ["last_elected_herald_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_last_elected_lord_commander_id_fkey"
            columns: ["last_elected_lord_commander_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      player_roles: {
        Row: {
          id: number
          player_id: number
          revealed_allies: Json
          role: Database["public"]["Enums"]["player_role"]
          room_id: number
        }
        Insert: {
          id?: never
          player_id: number
          revealed_allies?: Json
          role: Database["public"]["Enums"]["player_role"]
          room_id: number
        }
        Update: {
          id?: never
          player_id?: number
          revealed_allies?: Json
          role?: Database["public"]["Enums"]["player_role"]
          room_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_roles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_roles_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          display_name: string
          id: number
          is_alive: boolean
          joined_at: string
          room_id: number
          seat_order: number
          sigil: string
          user_id: string
        }
        Insert: {
          display_name: string
          id?: never
          is_alive?: boolean
          joined_at?: string
          room_id: number
          seat_order: number
          sigil?: string
          user_id: string
        }
        Update: {
          display_name?: string
          id?: never
          is_alive?: boolean
          joined_at?: string
          room_id?: number
          seat_order?: number
          sigil?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_deck: {
        Row: {
          card_type: Database["public"]["Enums"]["policy_type"]
          id: number
          pile: Database["public"]["Enums"]["pile_type"]
          position: number
          room_id: number
        }
        Insert: {
          card_type: Database["public"]["Enums"]["policy_type"]
          id?: never
          pile: Database["public"]["Enums"]["pile_type"]
          position: number
          room_id: number
        }
        Update: {
          card_type?: Database["public"]["Enums"]["policy_type"]
          id?: never
          pile?: Database["public"]["Enums"]["pile_type"]
          position?: number
          room_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_deck_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      presidential_actions: {
        Row: {
          acting_player_id: number
          action_type: Database["public"]["Enums"]["executive_power"]
          created_at: string
          id: number
          result: Json | null
          room_id: number
          round_id: number
          target_player_id: number | null
        }
        Insert: {
          acting_player_id: number
          action_type: Database["public"]["Enums"]["executive_power"]
          created_at?: string
          id?: never
          result?: Json | null
          room_id: number
          round_id: number
          target_player_id?: number | null
        }
        Update: {
          acting_player_id?: number
          action_type?: Database["public"]["Enums"]["executive_power"]
          created_at?: string
          id?: never
          result?: Json | null
          room_id?: number
          round_id?: number
          target_player_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "presidential_actions_acting_player_id_fkey"
            columns: ["acting_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presidential_actions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presidential_actions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presidential_actions_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          host_player_id: number | null
          id: number
          player_count: number
          room_code: string
          settings: Json
          status: Database["public"]["Enums"]["room_status"]
        }
        Insert: {
          created_at?: string
          host_player_id?: number | null
          id?: never
          player_count?: number
          room_code: string
          settings?: Json
          status?: Database["public"]["Enums"]["room_status"]
        }
        Update: {
          created_at?: string
          host_player_id?: number | null
          id?: never
          player_count?: number
          room_code?: string
          settings?: Json
          status?: Database["public"]["Enums"]["room_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_player_id_fk"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          chancellor_hand: Json | null
          chaos_policy: boolean
          created_at: string
          enacted_policy: Database["public"]["Enums"]["policy_type"] | null
          herald_hand: Json | null
          herald_id: number
          id: number
          lord_commander_id: number | null
          power_triggered: Database["public"]["Enums"]["executive_power"] | null
          room_id: number
          round_number: number
          veto_approved: boolean | null
          veto_requested: boolean
        }
        Insert: {
          chancellor_hand?: Json | null
          chaos_policy?: boolean
          created_at?: string
          enacted_policy?: Database["public"]["Enums"]["policy_type"] | null
          herald_hand?: Json | null
          herald_id: number
          id?: never
          lord_commander_id?: number | null
          power_triggered?:
            | Database["public"]["Enums"]["executive_power"]
            | null
          room_id: number
          round_number: number
          veto_approved?: boolean | null
          veto_requested?: boolean
        }
        Update: {
          chancellor_hand?: Json | null
          chaos_policy?: boolean
          created_at?: string
          enacted_policy?: Database["public"]["Enums"]["policy_type"] | null
          herald_hand?: Json | null
          herald_id?: number
          id?: never
          lord_commander_id?: number | null
          power_triggered?:
            | Database["public"]["Enums"]["executive_power"]
            | null
          room_id?: number
          round_number?: number
          veto_approved?: boolean | null
          veto_requested?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rounds_herald_id_fkey"
            columns: ["herald_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_lord_commander_id_fkey"
            columns: ["lord_commander_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: number
          player_id: number
          revealed: boolean
          room_id: number
          round_id: number
          vote: Database["public"]["Enums"]["vote_choice"]
        }
        Insert: {
          created_at?: string
          id?: never
          player_id: number
          revealed?: boolean
          room_id: number
          round_id: number
          vote: Database["public"]["Enums"]["vote_choice"]
        }
        Update: {
          created_at?: string
          id?: never
          player_id?: number
          revealed?: boolean
          room_id?: number
          round_id?: number
          vote?: Database["public"]["Enums"]["vote_choice"]
        }
        Relationships: [
          {
            foreignKeyName: "votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_rooms: { Args: never; Returns: undefined }
      get_user_room_ids: { Args: { _user_id: string }; Returns: number[] }
      is_player_in_room: {
        Args: { _room_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      executive_power:
        | "policy_peek"
        | "investigate_loyalty"
        | "special_election"
        | "execution"
      game_phase: "election" | "legislative" | "executive_action" | "game_over"
      pile_type: "draw" | "discard"
      player_role: "loyalist" | "traitor" | "usurper"
      policy_type: "loyalist" | "shadow"
      room_status: "lobby" | "in_progress" | "finished"
      vote_choice: "ja" | "nein"
      win_condition:
        | "loyalists_edicts"
        | "usurper_executed"
        | "traitors_edicts"
        | "usurper_crowned"
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
    Enums: {
      executive_power: [
        "policy_peek",
        "investigate_loyalty",
        "special_election",
        "execution",
      ],
      game_phase: ["election", "legislative", "executive_action", "game_over"],
      pile_type: ["draw", "discard"],
      player_role: ["loyalist", "traitor", "usurper"],
      policy_type: ["loyalist", "shadow"],
      room_status: ["lobby", "in_progress", "finished"],
      vote_choice: ["ja", "nein"],
      win_condition: [
        "loyalists_edicts",
        "usurper_executed",
        "traitors_edicts",
        "usurper_crowned",
      ],
    },
  },
} as const

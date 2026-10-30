export type Database = {
  public: {
    Tables: {
      profile_interests: {
        Row: { created_at: string; interest: string; user_id: string };
        Insert: { created_at?: string; interest: string; user_id: string };
        Update: { created_at?: string; interest?: string; user_id?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          attended_count: number;
          avatar_url: string | null;
          bio: string;
          city: string;
          created_at: string;
          display_name: string;
          id: string;
          onboarding_completed: boolean;
          one_liner: string;
          updated_at: string;
        };
        Insert: {
          attended_count?: number;
          avatar_url?: string | null;
          bio?: string;
          city?: string;
          created_at?: string;
          display_name?: string;
          id: string;
          onboarding_completed?: boolean;
          one_liner?: string;
          updated_at?: string;
        };
        Update: {
          attended_count?: number;
          avatar_url?: string | null;
          bio?: string;
          city?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          onboarding_completed?: boolean;
          one_liner?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_locations: {
        Row: {
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          search_radius_miles: number;
          source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          search_radius_miles?: number;
          source: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          search_radius_miles?: number;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      complete_my_onboarding: {
        Args: {
          p_address?: string;
          p_latitude?: number;
          p_longitude?: number;
          p_search_radius_miles?: number;
          p_source: string;
        };
        Returns: undefined;
      };
      replace_my_interests: {
        Args: { p_interests: string[] };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

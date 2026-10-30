export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          description: string;
          ends_at: string | null;
          external_id: string | null;
          id: string;
          image_url: string | null;
          price_label: string;
          source_name: string;
          source_type: string;
          source_url: string | null;
          starts_at: string;
          status: string;
          title: string;
          topics: string[];
          updated_at: string;
          venue_name: string;
        };
        Insert: {
          address?: string;
          city?: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          external_id?: string | null;
          id?: string;
          image_url?: string | null;
          price_label?: string;
          source_name: string;
          source_type: string;
          source_url?: string | null;
          starts_at: string;
          status?: string;
          title: string;
          topics?: string[];
          updated_at?: string;
          venue_name?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          external_id?: string | null;
          id?: string;
          image_url?: string | null;
          price_label?: string;
          source_name?: string;
          source_type?: string;
          source_url?: string | null;
          starts_at?: string;
          status?: string;
          title?: string;
          topics?: string[];
          updated_at?: string;
          venue_name?: string;
        };
        Relationships: [];
      };
      activity_discovery: {
        Row: { activity_id: string; created_at: string; user_id: string };
        Insert: { activity_id: string; created_at?: string; user_id: string };
        Update: { activity_id?: string; created_at?: string; user_id?: string };
        Relationships: [];
      };
      activity_states: {
        Row: { activity_id: string; interested: boolean; saved: boolean; updated_at: string; user_id: string };
        Insert: { activity_id: string; interested?: boolean; saved?: boolean; updated_at?: string; user_id: string };
        Update: { activity_id?: string; interested?: boolean; saved?: boolean; updated_at?: string; user_id?: string };
        Relationships: [];
      };
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
      set_my_activity_state: {
        Args: {
          p_activity_id: string;
          p_discoverable: boolean;
          p_interested: boolean;
          p_saved: boolean;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

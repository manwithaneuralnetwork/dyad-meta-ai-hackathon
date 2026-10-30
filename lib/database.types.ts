export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          dedupe_key: string;
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
          dedupe_key: string;
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
          dedupe_key?: string;
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
      groups: {
        Row: { id: string; activity_id: string; created_by: string; created_at: string; updated_at: string; last_message_at: string };
        Insert: { id?: string; activity_id: string; created_by: string; created_at?: string; updated_at?: string; last_message_at?: string };
        Update: { id?: string; activity_id?: string; created_by?: string; created_at?: string; updated_at?: string; last_message_at?: string };
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; user_id: string; role: string; joined_at: string; last_read_at: string };
        Insert: { group_id: string; user_id: string; role?: string; joined_at?: string; last_read_at?: string };
        Update: { group_id?: string; user_id?: string; role?: string; joined_at?: string; last_read_at?: string };
        Relationships: [];
      };
      group_invites: {
        Row: { id: string; group_id: string; inviter_id: string; invitee_id: string; status: string; created_at: string; responded_at: string | null };
        Insert: { id?: string; group_id: string; inviter_id: string; invitee_id: string; status?: string; created_at?: string; responded_at?: string | null };
        Update: { id?: string; group_id?: string; inviter_id?: string; invitee_id?: string; status?: string; created_at?: string; responded_at?: string | null };
        Relationships: [];
      };
      messages: {
        Row: { id: string; group_id: string; sender_id: string; body: string; created_at: string };
        Insert: { id?: string; group_id: string; sender_id: string; body: string; created_at?: string };
        Update: { id?: string; group_id?: string; sender_id?: string; body?: string; created_at?: string };
        Relationships: [];
      };
      notification_reads: {
        Row: { user_id: string; notification_key: string; read_at: string };
        Insert: { user_id: string; notification_key: string; read_at?: string };
        Update: { user_id?: string; notification_key?: string; read_at?: string };
        Relationships: [];
      };
      interest_tags: {
        Row: { active: boolean; created_at: string; is_core: boolean; label: string; source: string };
        Insert: { active?: boolean; created_at?: string; is_core?: boolean; label: string; source?: string };
        Update: { active?: boolean; created_at?: string; is_core?: boolean; label?: string; source?: string };
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
          age: number | null;
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
          age?: number | null;
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
          age?: number | null;
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
      create_activity_group: {
        Args: { p_activity_id: string; p_invitee_ids: string[] };
        Returns: string;
      };
      invite_more_to_group: {
        Args: { p_group_id: string; p_invitee_ids: string[] };
        Returns: number;
      };
      replace_my_interests: {
        Args: { p_interests: string[] };
        Returns: undefined;
      };
      respond_to_group_invite: {
        Args: { p_group_id: string; p_response: string };
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
      set_my_profile_details: {
        Args: { p_age: number; p_display_name: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

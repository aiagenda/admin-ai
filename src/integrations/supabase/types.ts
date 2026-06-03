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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_extraction_runs: {
        Row: {
          analysis_id: string | null
          confidence: number | null
          created_at: string
          doc_type: string | null
          document_id: string | null
          error_message: string | null
          extracted_fields: Json | null
          id: string
          language_code: string | null
          model: string | null
          prompt_version_id: string | null
          raw_output: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          confidence?: number | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_fields?: Json | null
          id?: string
          language_code?: string | null
          model?: string | null
          prompt_version_id?: string | null
          raw_output?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          confidence?: number | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_fields?: Json | null
          id?: string
          language_code?: string | null
          model?: string | null
          prompt_version_id?: string | null
          raw_output?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_extraction_runs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extraction_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extraction_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: string
          run_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: string
          run_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_field_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          data_type: string
          display_name: string
          doc_type: string
          field_key: string
          id: string
          is_active: boolean
          is_required: boolean
          prompt_snippet: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_type: string
          display_name: string
          doc_type?: string
          field_key: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          prompt_snippet?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_type?: string
          display_name?: string
          doc_type?: string
          field_key?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          prompt_snippet?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_prompt_versions: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string
          id: string
          is_active: boolean
          language_code: string
          name: string
          notes: string | null
          schema_prompt: string | null
          system_prompt: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          id?: string
          is_active?: boolean
          language_code?: string
          name: string
          notes?: string | null
          schema_prompt?: string | null
          system_prompt: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          id?: string
          is_active?: boolean
          language_code?: string
          name?: string
          notes?: string | null
          schema_prompt?: string | null
          system_prompt?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      analyses: {
        Row: {
          agency: string | null
          amount: string | null
          bank_account: string | null
          created_at: string
          deadline: string | null
          deadline_descriptions: string[] | null
          detected_category: string | null
          detected_tags: string[] | null
          doc_type: string | null
          document_id: string
          form_key: string | null
          id: string
          issuer: string | null
          legal_summary: string | null
          mentioned_laws: string[] | null
          recipient_name: string | null
          required_forms: string[] | null
          severity: string
          simple_summary: string | null
          state_code: string | null
          todo_legal: string | null
          todo_simple: string | null
          what_is_it: string
          what_to_do: string
        }
        Insert: {
          agency?: string | null
          amount?: string | null
          bank_account?: string | null
          created_at?: string
          deadline?: string | null
          deadline_descriptions?: string[] | null
          detected_category?: string | null
          detected_tags?: string[] | null
          doc_type?: string | null
          document_id: string
          form_key?: string | null
          id?: string
          issuer?: string | null
          legal_summary?: string | null
          mentioned_laws?: string[] | null
          recipient_name?: string | null
          required_forms?: string[] | null
          severity?: string
          simple_summary?: string | null
          state_code?: string | null
          todo_legal?: string | null
          todo_simple?: string | null
          what_is_it: string
          what_to_do: string
        }
        Update: {
          agency?: string | null
          amount?: string | null
          bank_account?: string | null
          created_at?: string
          deadline?: string | null
          deadline_descriptions?: string[] | null
          detected_category?: string | null
          detected_tags?: string[] | null
          doc_type?: string | null
          document_id?: string
          form_key?: string | null
          id?: string
          issuer?: string | null
          legal_summary?: string | null
          mentioned_laws?: string[] | null
          recipient_name?: string | null
          required_forms?: string[] | null
          severity?: string
          simple_summary?: string | null
          state_code?: string | null
          todo_legal?: string | null
          todo_simple?: string | null
          what_is_it?: string
          what_to_do?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis: {
        Row: {
          created_at: string | null
          deadline: string | null
          email: string | null
          id: string
          links: Json | null
          raw_text: string | null
          sender: string | null
          steps: string | null
          summary: string | null
          topic: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          email?: string | null
          id?: string
          links?: Json | null
          raw_text?: string | null
          sender?: string | null
          steps?: string | null
          summary?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          email?: string | null
          id?: string
          links?: Json | null
          raw_text?: string | null
          sender?: string | null
          steps?: string | null
          summary?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_analytics: {
        Row: {
          analysis_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_analytics_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_feedback: {
        Row: {
          analysis_id: string
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          summary_type: string | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          summary_type?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          summary_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          badge_text: string | null
          badge_variant: string | null
          content: string
          created_at: string
          date_label: string | null
          description: string
          faq_schema: Json | null
          id: string
          is_published: boolean
          keywords: string
          market: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          badge_variant?: string | null
          content?: string
          created_at?: string
          date_label?: string | null
          description?: string
          faq_schema?: Json | null
          id?: string
          is_published?: boolean
          keywords?: string
          market?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          badge_variant?: string | null
          content?: string
          created_at?: string
          date_label?: string | null
          description?: string
          faq_schema?: Json | null
          id?: string
          is_published?: boolean
          keywords?: string
          market?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      deadline_reminders: {
        Row: {
          analysis_id: string | null
          created_at: string
          deadline_date: string
          document_id: string | null
          email_sent: boolean | null
          error_message: string | null
          id: string
          notification_method: string
          reminder_type: string
          sent_at: string | null
          sms_sent: boolean | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          deadline_date: string
          document_id?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          notification_method: string
          reminder_type: string
          sent_at?: string | null
          sms_sent?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          deadline_date?: string
          document_id?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          notification_method?: string
          reminder_type?: string
          sent_at?: string | null
          sms_sent?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deadline_reminders_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_reminders_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_relations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_id_1: string
          document_id_2: string
          id: string
          relation_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id_1: string
          document_id_2: string
          id?: string
          relation_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id_1?: string
          document_id_2?: string
          id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_relations_document_id_1_fkey"
            columns: ["document_id_1"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_relations_document_id_2_fkey"
            columns: ["document_id_2"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_url: string
          filename: string
          id: string
          parent_document_id: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_url: string
          filename: string
          id?: string
          parent_document_id?: string | null
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_url?: string
          filename?: string
          id?: string
          parent_document_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          file_url: string
          filename: string
          id: string
          is_current_version: boolean | null
          parent_document_id: string | null
          status: string
          tags: string[] | null
          upload_date: string
          user_id: string
          version_number: number | null
        }
        Insert: {
          category?: string | null
          file_url: string
          filename: string
          id?: string
          is_current_version?: boolean | null
          parent_document_id?: string | null
          status?: string
          tags?: string[] | null
          upload_date?: string
          user_id: string
          version_number?: number | null
        }
        Update: {
          category?: string | null
          file_url?: string
          filename?: string
          id?: string
          is_current_version?: boolean | null
          parent_document_id?: string | null
          status?: string
          tags?: string[] | null
          upload_date?: string
          user_id?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          name_hu: string
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          name_hu: string
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          name_hu?: string
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      forms: {
        Row: {
          agency: string | null
          category: string | null
          created_at: string | null
          deadline_info: string | null
          description: string
          download_url: string | null
          file_hash: string | null
          fillable_online: boolean | null
          fillable_url: string | null
          form_type: string | null
          id: string
          institution: string
          instructions: string | null
          jurisdiction: string | null
          key: string
          last_updated: string | null
          market: string | null
          name: string
          official_source_url: string | null
          online_url: string | null
          pdf_url: string
          print_url: string | null
          required_documents: string[] | null
          state_code: string | null
          tags: string[] | null
        }
        Insert: {
          agency?: string | null
          category?: string | null
          created_at?: string | null
          deadline_info?: string | null
          description: string
          download_url?: string | null
          file_hash?: string | null
          fillable_online?: boolean | null
          fillable_url?: string | null
          form_type?: string | null
          id?: string
          institution: string
          instructions?: string | null
          jurisdiction?: string | null
          key: string
          last_updated?: string | null
          market?: string | null
          name: string
          official_source_url?: string | null
          online_url?: string | null
          pdf_url: string
          print_url?: string | null
          required_documents?: string[] | null
          state_code?: string | null
          tags?: string[] | null
        }
        Update: {
          agency?: string | null
          category?: string | null
          created_at?: string | null
          deadline_info?: string | null
          description?: string
          download_url?: string | null
          file_hash?: string | null
          fillable_online?: boolean | null
          fillable_url?: string | null
          form_type?: string | null
          id?: string
          institution?: string
          instructions?: string | null
          jurisdiction?: string | null
          key?: string
          last_updated?: string | null
          market?: string | null
          name?: string
          official_source_url?: string | null
          online_url?: string | null
          pdf_url?: string
          print_url?: string | null
          required_documents?: string[] | null
          state_code?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      invoice_usage_stats: {
        Row: {
          created_at: string
          id: string
          invoices_count: number
          month: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoices_count?: number
          month: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          invoices_count?: number
          month?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          ai_confidence: number | null
          created_at: string
          currency: string | null
          due_date: string | null
          expense_category: string | null
          file_url: string
          filename: string
          fulfillment_date: string | null
          gross_amount: number | null
          has_handwritten_content: boolean | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          item_description: string | null
          line_items: Json | null
          net_amount: number | null
          payment_method: string | null
          raw_ai_response: Json | null
          status: string | null
          updated_at: string
          upload_date: string
          user_id: string
          vat_amount: number | null
          vat_rate: string | null
          vendor_address: string | null
          vendor_name: string | null
          vendor_tax_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          expense_category?: string | null
          file_url: string
          filename: string
          fulfillment_date?: string | null
          gross_amount?: number | null
          has_handwritten_content?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_description?: string | null
          line_items?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          raw_ai_response?: Json | null
          status?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
          vat_amount?: number | null
          vat_rate?: string | null
          vendor_address?: string | null
          vendor_name?: string | null
          vendor_tax_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          expense_category?: string | null
          file_url?: string
          filename?: string
          fulfillment_date?: string | null
          gross_amount?: number | null
          has_handwritten_content?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_description?: string | null
          line_items?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          raw_ai_response?: Json | null
          status?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
          vat_amount?: number | null
          vat_rate?: string | null
          vendor_address?: string | null
          vendor_name?: string | null
          vendor_tax_id?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          market: string | null
          metadata: Json | null
          source_institution: string | null
          source_type: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          market?: string | null
          metadata?: Json | null
          source_institution?: string | null
          source_type?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          market?: string | null
          metadata?: Json | null
          source_institution?: string | null
          source_type?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_searches: {
        Row: {
          analysis_id: string | null
          created_at: string
          id: string
          query_text: string | null
          relevance_score: number | null
          retrieved_chunks: string[] | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          query_text?: string | null
          relevance_score?: number | null
          retrieved_chunks?: string[] | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          query_text?: string | null
          relevance_score?: number | null
          retrieved_chunks?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_searches_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      law_registry: {
        Row: {
          aliases: string[] | null
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          official_title: string
          short_name: string
          source_url: string
          topics: string[] | null
          typical_sections: Json | null
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          official_title: string
          short_name: string
          source_url: string
          topics?: string[] | null
          typical_sections?: Json | null
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          official_title?: string
          short_name?: string
          source_url?: string
          topics?: string[] | null
          typical_sections?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_1_day_before: boolean | null
          email_3_days_before: boolean | null
          email_7_days_before: boolean | null
          email_enabled: boolean | null
          email_on_deadline: boolean | null
          id: string
          push_1_day_before: boolean | null
          push_3_days_before: boolean | null
          push_7_days_before: boolean | null
          push_enabled: boolean | null
          push_on_deadline: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_1_day_before?: boolean | null
          email_3_days_before?: boolean | null
          email_7_days_before?: boolean | null
          email_enabled?: boolean | null
          email_on_deadline?: boolean | null
          id?: string
          push_1_day_before?: boolean | null
          push_3_days_before?: boolean | null
          push_7_days_before?: boolean | null
          push_enabled?: boolean | null
          push_on_deadline?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_1_day_before?: boolean | null
          email_3_days_before?: boolean | null
          email_7_days_before?: boolean | null
          email_enabled?: boolean | null
          email_on_deadline?: boolean | null
          id?: string
          push_1_day_before?: boolean | null
          push_3_days_before?: boolean | null
          push_7_days_before?: boolean | null
          push_enabled?: boolean | null
          push_on_deadline?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_feedback: {
        Row: {
          analysis_id: string | null
          correct_amount: string | null
          correct_bank_account: string | null
          correct_invoice_number: string | null
          correct_net_amount: string | null
          correct_vat_amount: string | null
          correct_vendor_name: string | null
          created_at: string
          document_id: string | null
          extracted_amount: string | null
          extracted_bank_account: string | null
          extracted_invoice_number: string | null
          extracted_net_amount: string | null
          extracted_vat_amount: string | null
          extracted_vendor_name: string | null
          feedback_comment: string | null
          handwritten_numbers_correct: boolean | null
          handwritten_numbers_detected: boolean | null
          id: string
          improvement_suggestions: string | null
          invoice_id: string | null
          ocr_accuracy: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          correct_amount?: string | null
          correct_bank_account?: string | null
          correct_invoice_number?: string | null
          correct_net_amount?: string | null
          correct_vat_amount?: string | null
          correct_vendor_name?: string | null
          created_at?: string
          document_id?: string | null
          extracted_amount?: string | null
          extracted_bank_account?: string | null
          extracted_invoice_number?: string | null
          extracted_net_amount?: string | null
          extracted_vat_amount?: string | null
          extracted_vendor_name?: string | null
          feedback_comment?: string | null
          handwritten_numbers_correct?: boolean | null
          handwritten_numbers_detected?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          invoice_id?: string | null
          ocr_accuracy?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          correct_amount?: string | null
          correct_bank_account?: string | null
          correct_invoice_number?: string | null
          correct_net_amount?: string | null
          correct_vat_amount?: string | null
          correct_vendor_name?: string | null
          created_at?: string
          document_id?: string | null
          extracted_amount?: string | null
          extracted_bank_account?: string | null
          extracted_invoice_number?: string | null
          extracted_net_amount?: string | null
          extracted_vat_amount?: string | null
          extracted_vendor_name?: string | null
          feedback_comment?: string | null
          handwritten_numbers_correct?: boolean | null
          handwritten_numbers_detected?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          invoice_id?: string | null
          ocr_accuracy?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_feedback_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_feedback_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_export_view"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          agency: string | null
          created_at: string
          description: string | null
          doc_type: string
          id: string
          is_active: boolean | null
          jurisdiction: string | null
          market: string | null
          name: string
          priority: number | null
          related_forms: string[] | null
          related_laws: string[] | null
          state_code: string | null
          steps: Json
          tips: string[] | null
          trigger_categories: string[] | null
          trigger_keywords: string[] | null
          trigger_tags: string[] | null
          updated_at: string
          warnings: string[] | null
        }
        Insert: {
          agency?: string | null
          created_at?: string
          description?: string | null
          doc_type: string
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          market?: string | null
          name: string
          priority?: number | null
          related_forms?: string[] | null
          related_laws?: string[] | null
          state_code?: string | null
          steps?: Json
          tips?: string[] | null
          trigger_categories?: string[] | null
          trigger_keywords?: string[] | null
          trigger_tags?: string[] | null
          updated_at?: string
          warnings?: string[] | null
        }
        Update: {
          agency?: string | null
          created_at?: string
          description?: string | null
          doc_type?: string
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          market?: string | null
          name?: string
          priority?: number | null
          related_forms?: string[] | null
          related_laws?: string[] | null
          state_code?: string | null
          steps?: Json
          tips?: string[] | null
          trigger_categories?: string[] | null
          trigger_keywords?: string[] | null
          trigger_tags?: string[] | null
          updated_at?: string
          warnings?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tab_view_analytics: {
        Row: {
          analysis_id: string
          id: string
          tab_type: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          analysis_id: string
          id?: string
          tab_type: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          analysis_id?: string
          id?: string
          tab_type?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tab_view_analytics_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_progress: {
        Row: {
          analysis_id: string
          completed: boolean
          completed_at: string | null
          created_at: string | null
          id: string
          todo_index: number
          user_id: string
        }
        Insert: {
          analysis_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          id?: string
          todo_index: number
          user_id: string
        }
        Update: {
          analysis_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          id?: string
          todo_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_progress_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          accountant_auto_send_day: number | null
          accountant_auto_send_enabled: boolean | null
          accountant_email: string | null
          accountant_export_format: string | null
          created_at: string
          id: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accountant_auto_send_day?: number | null
          accountant_auto_send_enabled?: boolean | null
          accountant_email?: string | null
          accountant_export_format?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accountant_auto_send_day?: number | null
          accountant_auto_send_enabled?: boolean | null
          accountant_email?: string | null
          accountant_export_format?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          documents_per_month: number
          free_trial_docs_used: number
          id: string
          plan_type: string
          prepaid_basic_credits: number
          prepaid_pro_credits: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_per_month?: number
          free_trial_docs_used?: number
          id?: string
          plan_type?: string
          prepaid_basic_credits?: number
          prepaid_pro_credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_per_month?: number
          free_trial_docs_used?: number
          id?: string
          plan_type?: string
          prepaid_basic_credits?: number
          prepaid_pro_credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage_stats: {
        Row: {
          created_at: string
          documents_count: number
          id: string
          month: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          documents_count?: number
          id?: string
          month: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          documents_count?: number
          id?: string
          month?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      invoices_export_view: {
        Row: {
          category_name_hu: string | null
          currency: string | null
          due_date: string | null
          expense_category: string | null
          filename: string | null
          gross_amount: number | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          item_description: string | null
          net_amount: number | null
          status: string | null
          upload_date: string | null
          user_id: string | null
          vat_amount: number | null
          vat_rate: string | null
          vendor_name: string | null
          vendor_tax_id: string | null
        }
        Relationships: []
      }
      knowledge_base_stats: {
        Row: {
          category: string | null
          chunk_count: number | null
          document_count: number | null
          last_updated: string | null
          source_institution: string | null
          source_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_admin: { Args: never; Returns: boolean }
      cache_kb_search: {
        Args: { _query_hash: string; _results: Json }
        Returns: undefined
      }
      can_access_invoices: { Args: { _user_id: string }; Returns: boolean }
      can_user_upload: {
        Args: { _user_id: string }
        Returns: {
          can_upload: boolean
          current_usage: number
          limit_amount: number
          plan_type: string
          prepaid_basic_credits: number
          prepaid_pro_credits: number
        }[]
      }
      get_admin_revenue_stats: { Args: never; Returns: Json }
      get_admin_user_stats: { Args: never; Returns: Json }
      get_admin_users_list: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: Json
      }
      get_ai_quality_summary: {
        Args: { _days?: number }
        Returns: {
          avg_confidence: number
          failed_runs: number
          helpful_feedback: number
          negative_feedback: number
          success_runs: number
          total_runs: number
        }[]
      }
      get_cached_kb_search: {
        Args: { _cache_ttl_minutes?: number; _query_hash: string }
        Returns: {
          chunk_id: string
          chunk_text: string
          document_id: string
          document_title: string
          similarity: number
        }[]
      }
      get_current_month_usage: { Args: { _user_id: string }; Returns: number }
      get_document_version_history: {
        Args: { p_document_id: string }
        Returns: {
          change_description: string
          created_at: string
          created_by: string
          document_id: string
          file_url: string
          filename: string
          id: string
          parent_document_id: string
          version_number: number
        }[]
      }
      get_laws_by_topics: {
        Args: { _topics: string[] }
        Returns: {
          id: string
          match_count: number
          official_title: string
          short_name: string
          source_url: string
          topics: string[]
          typical_sections: Json
        }[]
      }
      get_matching_playbook:
        | {
            Args: {
              _category?: string
              _content_keywords?: string[]
              _tags?: string[]
            }
            Returns: {
              description: string
              doc_type: string
              id: string
              match_score: number
              name: string
              related_forms: string[]
              related_laws: string[]
              steps: Json
              tips: string[]
              warnings: string[]
            }[]
          }
        | {
            Args: {
              _agency?: string
              _category?: string
              _content_keywords?: string[]
              _doc_type?: string
              _market?: string
              _state_code?: string
              _tags?: string[]
            }
            Returns: {
              agency: string
              description: string
              doc_type: string
              id: string
              jurisdiction: string
              match_score: number
              name: string
              related_forms: string[]
              related_laws: string[]
              state_code: string
              steps: Json
              tips: string[]
              warnings: string[]
            }[]
          }
      get_notification_preferences: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          email_1_day_before: boolean
          email_3_days_before: boolean
          email_7_days_before: boolean
          email_enabled: boolean
          email_on_deadline: boolean
          id: string
          push_1_day_before: boolean
          push_3_days_before: boolean
          push_7_days_before: boolean
          push_enabled: boolean
          push_on_deadline: boolean
          updated_at: string
          user_id: string
        }[]
      }
      get_related_documents: {
        Args: { p_document_id: string }
        Returns: {
          created_at: string
          description: string
          document_id: string
          id: string
          related_category: string
          related_document_id: string
          related_filename: string
          related_status: string
          related_upload_date: string
          relation_type: string
        }[]
      }
      get_user_profile: {
        Args: { _user_id: string }
        Returns: {
          accountant_auto_send_day: number
          accountant_auto_send_enabled: boolean
          accountant_email: string
          accountant_export_format: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_subscription: {
        Args: { _user_id: string }
        Returns: {
          documents_per_month: number
          plan_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_invoice_usage: { Args: { _user_id: string }; Returns: boolean }
      increment_user_usage: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      refresh_kb_stats: { Args: never; Returns: undefined }
      resolve_law_reference: {
        Args: { _name_or_alias: string }
        Returns: {
          aliases: string[]
          id: string
          notes: string
          official_title: string
          short_name: string
          source_url: string
          topics: string[]
          typical_sections: Json
        }[]
      }
      search_by_category: {
        Args: { _category: string; _user_id?: string }
        Returns: {
          analysis_id: string
          category: string
          deadline: string
          filename: string
          id: string
          severity: string
          tags: string[]
          upload_date: string
        }[]
      }
      search_by_date_range: {
        Args: { _end_date?: string; _start_date?: string; _user_id?: string }
        Returns: {
          analysis_id: string
          category: string
          deadline: string
          filename: string
          id: string
          severity: string
          tags: string[]
          upload_date: string
        }[]
      }
      search_knowledge_base: {
        Args: {
          _category?: string
          _limit?: number
          _market?: string
          _query_embedding: string
          _state_code?: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          chunk_text: string
          document_category: string
          document_id: string
          document_title: string
          market: string
          similarity: number
          source_institution: string
          state_code: string
        }[]
      }
      search_similar_documents: {
        Args: { _category?: string; _tags?: string[]; _user_id?: string }
        Returns: {
          analysis_id: string
          category: string
          deadline: string
          filename: string
          id: string
          severity: string
          tags: string[]
          upload_date: string
        }[]
      }
      trigger_deadline_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

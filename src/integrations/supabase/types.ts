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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      aile_mapping_rules: {
        Row: {
          created_at: string
          created_by: string
          has_balance_logic: boolean | null
          id: string
          is_active: boolean
          match_field: string
          match_pattern: string
          match_type: string
          negative_face_group: string | null
          negative_note_group: string | null
          negative_sub_note: string | null
          positive_face_group: string | null
          positive_note_group: string | null
          positive_sub_note: string | null
          priority: number
          rule_set_id: string
          target_aile: string
          target_face_group: string | null
          target_fs_area: string
          target_note_group: string | null
          target_sub_note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          has_balance_logic?: boolean | null
          id?: string
          is_active?: boolean
          match_field?: string
          match_pattern: string
          match_type?: string
          negative_face_group?: string | null
          negative_note_group?: string | null
          negative_sub_note?: string | null
          positive_face_group?: string | null
          positive_note_group?: string | null
          positive_sub_note?: string | null
          priority?: number
          rule_set_id: string
          target_aile: string
          target_face_group?: string | null
          target_fs_area: string
          target_note_group?: string | null
          target_sub_note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          has_balance_logic?: boolean | null
          id?: string
          is_active?: boolean
          match_field?: string
          match_pattern?: string
          match_type?: string
          negative_face_group?: string | null
          negative_note_group?: string | null
          negative_sub_note?: string | null
          positive_face_group?: string | null
          positive_note_group?: string | null
          positive_sub_note?: string | null
          priority?: number
          rule_set_id?: string
          target_aile?: string
          target_face_group?: string | null
          target_fs_area?: string
          target_note_group?: string | null
          target_sub_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aile_mapping_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "aile_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      aile_rule_sets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_procedures: {
        Row: {
          approval_stage: string
          approved_at: string | null
          approved_by: string | null
          area: string
          assertion: string | null
          assigned_to: string | null
          checklist_items: Json
          completed_date: string | null
          conclusion: string | null
          conclusion_prompt: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          engagement_id: string
          evidence_requirements: Json
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          prepared_at: string | null
          prepared_by: string | null
          procedure_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          template_id: string | null
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
          workpaper_ref: string | null
        }
        Insert: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          area: string
          assertion?: string | null
          assigned_to?: string | null
          checklist_items?: Json
          completed_date?: string | null
          conclusion?: string | null
          conclusion_prompt?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          engagement_id: string
          evidence_requirements?: Json
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          procedure_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          template_id?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          workpaper_ref?: string | null
        }
        Update: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          area?: string
          assertion?: string | null
          assigned_to?: string | null
          checklist_items?: Json
          completed_date?: string | null
          conclusion?: string | null
          conclusion_prompt?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          engagement_id?: string
          evidence_requirements?: Json
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          procedure_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          template_id?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          workpaper_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_procedures_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_procedures_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_procedures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "standard_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_comments: {
        Row: {
          assigned_to: string | null
          clause_id: string | null
          comment_text: string
          comment_type: string | null
          created_at: string
          created_by: string
          document_id: string | null
          engagement_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          response_text: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          clause_id?: string | null
          comment_text: string
          comment_type?: string | null
          created_at?: string
          created_by: string
          document_id?: string | null
          engagement_id: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_text?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          clause_id?: string | null
          comment_text?: string
          comment_type?: string | null
          created_at?: string
          created_by?: string
          document_id?: string | null
          engagement_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_text?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "audit_report_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_comments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_document_versions: {
        Row: {
          change_reason: string | null
          changed_by: string
          content_html: string | null
          content_json: Json | null
          created_at: string
          document_id: string
          id: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          document_id: string
          id?: string
          version_number: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          document_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "audit_report_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_documents: {
        Row: {
          changed_by: string | null
          content_html: string | null
          content_json: Json | null
          created_at: string
          engagement_id: string
          id: string
          is_locked: boolean | null
          section_name: string
          section_title: string | null
          updated_at: string
          version_number: number | null
        }
        Insert: {
          changed_by?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          engagement_id: string
          id?: string
          is_locked?: boolean | null
          section_name: string
          section_title?: string | null
          updated_at?: string
          version_number?: number | null
        }
        Update: {
          changed_by?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          engagement_id?: string
          id?: string
          is_locked?: boolean | null
          section_name?: string
          section_title?: string | null
          updated_at?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_evidence: {
        Row: {
          clause_id: string | null
          description: string | null
          engagement_id: string
          evidence_file_id: string | null
          id: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string
          working_paper_ref: string | null
        }
        Insert: {
          clause_id?: string | null
          description?: string | null
          engagement_id: string
          evidence_file_id?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by: string
          working_paper_ref?: string | null
        }
        Update: {
          clause_id?: string | null
          description?: string | null
          engagement_id?: string
          evidence_file_id?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string
          working_paper_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_evidence_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_evidence_evidence_file_id_fkey"
            columns: ["evidence_file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_exports: {
        Row: {
          created_at: string
          created_by: string
          engagement_id: string
          export_type: string
          export_version: number
          file_name: string | null
          file_path: string | null
          id: string
          is_final: boolean | null
        }
        Insert: {
          created_at?: string
          created_by: string
          engagement_id: string
          export_type: string
          export_version: number
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_final?: boolean | null
        }
        Update: {
          created_at?: string
          created_by?: string
          engagement_id?: string
          export_type?: string
          export_version?: number
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_final?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_exports_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_main_content: {
        Row: {
          basis_for_opinion: string | null
          board_report_misstatement_details: string | null
          board_report_status: string | null
          clause_143_3_a_details: string | null
          clause_143_3_a_status: string | null
          clause_143_3_b_audit_trail_details: string | null
          clause_143_3_b_audit_trail_status: string | null
          clause_143_3_b_server_outside_india: boolean | null
          clause_143_3_c_branch_returns: string | null
          clause_143_3_e_going_concern_impact: string | null
          clause_143_3_f_directors_disqualified: boolean | null
          clause_143_3_f_disqualified_details: string | null
          clause_143_3_g_qualification_impact: string | null
          clause_143_3_h_details: string | null
          clause_143_3_h_remuneration_status: string | null
          clause_143_3_i_ifc_qualification: string | null
          created_at: string | null
          created_by: string
          emphasis_of_matter_items: Json | null
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          firm_name: string | null
          firm_registration_no: string | null
          going_concern_details: string | null
          going_concern_note_ref: string | null
          has_emphasis_of_matter: boolean | null
          has_going_concern_uncertainty: boolean | null
          has_other_matter: boolean | null
          id: string
          include_kam: boolean | null
          is_finalized: boolean | null
          membership_no: string | null
          opinion_type: string
          other_matter_items: Json | null
          partner_name: string | null
          qualification_details: string | null
          rule_11_a_note_ref: string | null
          rule_11_a_pending_litigations: string | null
          rule_11_b_long_term_contracts: string | null
          rule_11_b_note_ref: string | null
          rule_11_c_delay_amount: number | null
          rule_11_c_delay_details: string | null
          rule_11_c_iepf_status: string | null
          rule_11_d_audit_procedures_status: string | null
          rule_11_d_loan_fund_representations: boolean | null
          rule_11_d_modification_details: string | null
          rule_11_d_receiving_fund_representations: boolean | null
          rule_11_e_dividend_note_ref: string | null
          rule_11_e_dividend_status: string | null
          rule_11_e_final_dividend_amount: number | null
          rule_11_e_interim_dividend_amount: number | null
          rule_11_f_audit_trail_details: string | null
          rule_11_f_audit_trail_status: string | null
          rule_11_g_funds_advanced_details: string | null
          rule_11_g_funds_advanced_status: string | null
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          basis_for_opinion?: string | null
          board_report_misstatement_details?: string | null
          board_report_status?: string | null
          clause_143_3_a_details?: string | null
          clause_143_3_a_status?: string | null
          clause_143_3_b_audit_trail_details?: string | null
          clause_143_3_b_audit_trail_status?: string | null
          clause_143_3_b_server_outside_india?: boolean | null
          clause_143_3_c_branch_returns?: string | null
          clause_143_3_e_going_concern_impact?: string | null
          clause_143_3_f_directors_disqualified?: boolean | null
          clause_143_3_f_disqualified_details?: string | null
          clause_143_3_g_qualification_impact?: string | null
          clause_143_3_h_details?: string | null
          clause_143_3_h_remuneration_status?: string | null
          clause_143_3_i_ifc_qualification?: string | null
          created_at?: string | null
          created_by: string
          emphasis_of_matter_items?: Json | null
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          firm_name?: string | null
          firm_registration_no?: string | null
          going_concern_details?: string | null
          going_concern_note_ref?: string | null
          has_emphasis_of_matter?: boolean | null
          has_going_concern_uncertainty?: boolean | null
          has_other_matter?: boolean | null
          id?: string
          include_kam?: boolean | null
          is_finalized?: boolean | null
          membership_no?: string | null
          opinion_type?: string
          other_matter_items?: Json | null
          partner_name?: string | null
          qualification_details?: string | null
          rule_11_a_note_ref?: string | null
          rule_11_a_pending_litigations?: string | null
          rule_11_b_long_term_contracts?: string | null
          rule_11_b_note_ref?: string | null
          rule_11_c_delay_amount?: number | null
          rule_11_c_delay_details?: string | null
          rule_11_c_iepf_status?: string | null
          rule_11_d_audit_procedures_status?: string | null
          rule_11_d_loan_fund_representations?: boolean | null
          rule_11_d_modification_details?: string | null
          rule_11_d_receiving_fund_representations?: boolean | null
          rule_11_e_dividend_note_ref?: string | null
          rule_11_e_dividend_status?: string | null
          rule_11_e_final_dividend_amount?: number | null
          rule_11_e_interim_dividend_amount?: number | null
          rule_11_f_audit_trail_details?: string | null
          rule_11_f_audit_trail_status?: string | null
          rule_11_g_funds_advanced_details?: string | null
          rule_11_g_funds_advanced_status?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          basis_for_opinion?: string | null
          board_report_misstatement_details?: string | null
          board_report_status?: string | null
          clause_143_3_a_details?: string | null
          clause_143_3_a_status?: string | null
          clause_143_3_b_audit_trail_details?: string | null
          clause_143_3_b_audit_trail_status?: string | null
          clause_143_3_b_server_outside_india?: boolean | null
          clause_143_3_c_branch_returns?: string | null
          clause_143_3_e_going_concern_impact?: string | null
          clause_143_3_f_directors_disqualified?: boolean | null
          clause_143_3_f_disqualified_details?: string | null
          clause_143_3_g_qualification_impact?: string | null
          clause_143_3_h_details?: string | null
          clause_143_3_h_remuneration_status?: string | null
          clause_143_3_i_ifc_qualification?: string | null
          created_at?: string | null
          created_by?: string
          emphasis_of_matter_items?: Json | null
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          firm_name?: string | null
          firm_registration_no?: string | null
          going_concern_details?: string | null
          going_concern_note_ref?: string | null
          has_emphasis_of_matter?: boolean | null
          has_going_concern_uncertainty?: boolean | null
          has_other_matter?: boolean | null
          id?: string
          include_kam?: boolean | null
          is_finalized?: boolean | null
          membership_no?: string | null
          opinion_type?: string
          other_matter_items?: Json | null
          partner_name?: string | null
          qualification_details?: string | null
          rule_11_a_note_ref?: string | null
          rule_11_a_pending_litigations?: string | null
          rule_11_b_long_term_contracts?: string | null
          rule_11_b_note_ref?: string | null
          rule_11_c_delay_amount?: number | null
          rule_11_c_delay_details?: string | null
          rule_11_c_iepf_status?: string | null
          rule_11_d_audit_procedures_status?: string | null
          rule_11_d_loan_fund_representations?: boolean | null
          rule_11_d_modification_details?: string | null
          rule_11_d_receiving_fund_representations?: boolean | null
          rule_11_e_dividend_note_ref?: string | null
          rule_11_e_dividend_status?: string | null
          rule_11_e_final_dividend_amount?: number | null
          rule_11_e_interim_dividend_amount?: number | null
          rule_11_f_audit_trail_details?: string | null
          rule_11_f_audit_trail_status?: string | null
          rule_11_g_funds_advanced_details?: string | null
          rule_11_g_funds_advanced_status?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_main_content_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_setup: {
        Row: {
          accounting_framework: string | null
          borrowings_amount: number | null
          branch_locations: string | null
          caro_annexure_letter: string | null
          caro_applicable_status: string | null
          caro_exclusion_reason: string | null
          cash_flow_required: boolean | null
          company_cin: string | null
          company_type: string | null
          created_at: string
          created_by: string
          engagement_id: string
          has_branch_auditors: boolean | null
          has_predecessor_auditor: boolean | null
          has_subsidiaries: boolean | null
          id: string
          ifc_annexure_letter: string | null
          ifc_applicable: boolean | null
          is_listed_company: boolean | null
          is_private_company: boolean | null
          is_standalone: boolean | null
          locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          nature_of_business: string | null
          paid_up_capital: number | null
          predecessor_auditor_name: string | null
          predecessor_report_date: string | null
          registered_office: string | null
          report_city: string | null
          report_date: string | null
          report_status: string | null
          reserves_surplus: number | null
          setup_completed: boolean | null
          signing_partner_id: string | null
          udin: string | null
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
        }
        Insert: {
          accounting_framework?: string | null
          borrowings_amount?: number | null
          branch_locations?: string | null
          caro_annexure_letter?: string | null
          caro_applicable_status?: string | null
          caro_exclusion_reason?: string | null
          cash_flow_required?: boolean | null
          company_cin?: string | null
          company_type?: string | null
          created_at?: string
          created_by: string
          engagement_id: string
          has_branch_auditors?: boolean | null
          has_predecessor_auditor?: boolean | null
          has_subsidiaries?: boolean | null
          id?: string
          ifc_annexure_letter?: string | null
          ifc_applicable?: boolean | null
          is_listed_company?: boolean | null
          is_private_company?: boolean | null
          is_standalone?: boolean | null
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          nature_of_business?: string | null
          paid_up_capital?: number | null
          predecessor_auditor_name?: string | null
          predecessor_report_date?: string | null
          registered_office?: string | null
          report_city?: string | null
          report_date?: string | null
          report_status?: string | null
          reserves_surplus?: number | null
          setup_completed?: boolean | null
          signing_partner_id?: string | null
          udin?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Update: {
          accounting_framework?: string | null
          borrowings_amount?: number | null
          branch_locations?: string | null
          caro_annexure_letter?: string | null
          caro_applicable_status?: string | null
          caro_exclusion_reason?: string | null
          cash_flow_required?: boolean | null
          company_cin?: string | null
          company_type?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string
          has_branch_auditors?: boolean | null
          has_predecessor_auditor?: boolean | null
          has_subsidiaries?: boolean | null
          id?: string
          ifc_annexure_letter?: string | null
          ifc_applicable?: boolean | null
          is_listed_company?: boolean | null
          is_private_company?: boolean | null
          is_standalone?: boolean | null
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          nature_of_business?: string | null
          paid_up_capital?: number | null
          predecessor_auditor_name?: string | null
          predecessor_report_date?: string | null
          registered_office?: string | null
          report_city?: string | null
          report_date?: string | null
          report_status?: string | null
          reserves_surplus?: number | null
          setup_completed?: boolean | null
          signing_partner_id?: string | null
          udin?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_setup_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_setup_signing_partner_id_fkey"
            columns: ["signing_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string
          reason: string | null
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by: string
          reason?: string | null
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string
          reason?: string | null
        }
        Relationships: []
      }
      caro_clause_library: {
        Row: {
          applicability_conditions: Json | null
          applies_to_cfs: boolean | null
          clause_description: string | null
          clause_id: string
          clause_title: string
          created_at: string
          evidence_checklist: Json | null
          follow_up_questions: Json | null
          id: string
          is_active: boolean | null
          na_wording: string | null
          negative_wording: string | null
          parent_clause_id: string | null
          positive_wording: string | null
          qualified_wording: string | null
          questions: Json | null
          red_flags: Json | null
          required_tables: Json | null
          reviewer_prompts: Json | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          applicability_conditions?: Json | null
          applies_to_cfs?: boolean | null
          clause_description?: string | null
          clause_id: string
          clause_title: string
          created_at?: string
          evidence_checklist?: Json | null
          follow_up_questions?: Json | null
          id?: string
          is_active?: boolean | null
          na_wording?: string | null
          negative_wording?: string | null
          parent_clause_id?: string | null
          positive_wording?: string | null
          qualified_wording?: string | null
          questions?: Json | null
          red_flags?: Json | null
          required_tables?: Json | null
          reviewer_prompts?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          applicability_conditions?: Json | null
          applies_to_cfs?: boolean | null
          clause_description?: string | null
          clause_id?: string
          clause_title?: string
          created_at?: string
          evidence_checklist?: Json | null
          follow_up_questions?: Json | null
          id?: string
          is_active?: boolean | null
          na_wording?: string | null
          negative_wording?: string | null
          parent_clause_id?: string | null
          positive_wording?: string | null
          qualified_wording?: string | null
          questions?: Json | null
          red_flags?: Json | null
          required_tables?: Json | null
          reviewer_prompts?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      caro_clause_responses: {
        Row: {
          answers: Json | null
          approved_at: string | null
          approved_by: string | null
          clause_id: string
          conclusion_text: string | null
          created_at: string
          engagement_id: string
          exceptions_text: string | null
          id: string
          impact_description: string | null
          impacts_main_report: boolean | null
          is_applicable: boolean | null
          management_response: string | null
          management_response_captured: boolean | null
          na_reason: string | null
          prepared_at: string | null
          prepared_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          table_data: Json | null
          updated_at: string
          version_number: number | null
          working_paper_refs: Json | null
        }
        Insert: {
          answers?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          clause_id: string
          conclusion_text?: string | null
          created_at?: string
          engagement_id: string
          exceptions_text?: string | null
          id?: string
          impact_description?: string | null
          impacts_main_report?: boolean | null
          is_applicable?: boolean | null
          management_response?: string | null
          management_response_captured?: boolean | null
          na_reason?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          table_data?: Json | null
          updated_at?: string
          version_number?: number | null
          working_paper_refs?: Json | null
        }
        Update: {
          answers?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          clause_id?: string
          conclusion_text?: string | null
          created_at?: string
          engagement_id?: string
          exceptions_text?: string | null
          id?: string
          impact_description?: string | null
          impacts_main_report?: boolean | null
          is_applicable?: boolean | null
          management_response?: string | null
          management_response_captured?: boolean | null
          na_reason?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          table_data?: Json | null
          updated_at?: string
          version_number?: number | null
          working_paper_refs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "caro_clause_responses_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      caro_standard_answers: {
        Row: {
          clause_id: string
          created_at: string
          created_by: string
          id: string
          na_wording: string | null
          negative_wording: string | null
          positive_wording: string | null
          updated_at: string
        }
        Insert: {
          clause_id: string
          created_at?: string
          created_by: string
          id?: string
          na_wording?: string | null
          negative_wording?: string | null
          positive_wording?: string | null
          updated_at?: string
        }
        Update: {
          clause_id?: string
          created_at?: string
          created_by?: string
          id?: string
          na_wording?: string | null
          negative_wording?: string | null
          positive_wording?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          cin: string | null
          constitution: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          industry: string
          name: string
          notes: string | null
          pan: string | null
          pin: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cin?: string | null
          constitution?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          industry: string
          name: string
          notes?: string | null
          pan?: string | null
          pin?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cin?: string | null
          constitution?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string
          name?: string
          notes?: string | null
          pan?: string | null
          pin?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      engagement_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          engagement_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          engagement_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          engagement_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          end_date: string | null
          engagement_type: string
          financial_year: string
          id: string
          manager_id: string | null
          materiality_amount: number | null
          name: string
          notes: string | null
          partner_id: string | null
          performance_materiality: number | null
          start_date: string | null
          status: string
          trivial_threshold: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by: string
          end_date?: string | null
          engagement_type?: string
          financial_year: string
          id?: string
          manager_id?: string | null
          materiality_amount?: number | null
          name: string
          notes?: string | null
          partner_id?: string | null
          performance_materiality?: number | null
          start_date?: string | null
          status?: string
          trivial_threshold?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          engagement_type?: string
          financial_year?: string
          id?: string
          manager_id?: string | null
          materiality_amount?: number | null
          name?: string
          notes?: string | null
          partner_id?: string | null
          performance_materiality?: number | null
          start_date?: string | null
          status?: string
          trivial_threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "engagements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          approval_stage: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          engagement_id: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
          linked_procedure: string | null
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          mime_type: string | null
          name: string
          prepared_at: string | null
          prepared_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
          uploaded_by: string
          workpaper_ref: string | null
        }
        Insert: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          engagement_id?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
          linked_procedure?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mime_type?: string | null
          name: string
          prepared_at?: string | null
          prepared_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          uploaded_by: string
          workpaper_ref?: string | null
        }
        Update: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          engagement_id?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          linked_procedure?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mime_type?: string | null
          name?: string
          prepared_at?: string | null
          prepared_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          uploaded_by?: string
          workpaper_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          evidence_id: string
          evidence_requirement_id: string | null
          id: string
          linked_at: string
          linked_by: string
          procedure_id: string
        }
        Insert: {
          evidence_id: string
          evidence_requirement_id?: string | null
          id?: string
          linked_at?: string
          linked_by: string
          procedure_id: string
        }
        Update: {
          evidence_id?: string
          evidence_requirement_id?: string | null
          id?: string
          linked_at?: string
          linked_by?: string
          procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_evidence_requirement_id_fkey"
            columns: ["evidence_requirement_id"]
            isOneToOne: false
            referencedRelation: "procedure_evidence_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_years: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          id: string
          is_active: boolean
          year_code: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          is_active?: boolean
          year_code: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          is_active?: boolean
          year_code?: string
        }
        Relationships: []
      }
      firm_settings: {
        Row: {
          address: string | null
          constitution: string | null
          created_at: string
          created_by: string
          firm_name: string
          firm_registration_no: string | null
          icai_unique_sl_no: string | null
          id: string
          no_of_partners: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          constitution?: string | null
          created_at?: string
          created_by: string
          firm_name: string
          firm_registration_no?: string | null
          icai_unique_sl_no?: string | null
          id?: string
          no_of_partners?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          constitution?: string | null
          created_at?: string
          created_by?: string
          firm_name?: string
          firm_registration_no?: string | null
          icai_unique_sl_no?: string | null
          id?: string
          no_of_partners?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fs_templates: {
        Row: {
          constitution_type: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          level1: string
          level2: string | null
          level3: string | null
          level4: string | null
          level5: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          constitution_type: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          level1: string
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          constitution_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          level1?: string
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      key_audit_matters: {
        Row: {
          audit_response: string
          created_at: string
          created_by: string
          description: string
          engagement_id: string
          id: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          audit_response: string
          created_at?: string
          created_by: string
          description: string
          engagement_id: string
          id?: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          audit_response?: string
          created_at?: string
          created_by?: string
          description?: string
          engagement_id?: string
          id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_audit_matters_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          created_by: string
          date_of_exit: string | null
          date_of_joining: string
          email: string | null
          id: string
          is_active: boolean
          membership_number: string
          name: string
          pan: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          date_of_exit?: string | null
          date_of_joining: string
          email?: string | null
          id?: string
          is_active?: boolean
          membership_number: string
          name: string
          pan?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          date_of_exit?: string | null
          date_of_joining?: string
          email?: string | null
          id?: string
          is_active?: boolean
          membership_number?: string
          name?: string
          pan?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      procedure_assignees: {
        Row: {
          assigned_by: string
          created_at: string
          id: string
          procedure_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          id?: string
          procedure_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          id?: string
          procedure_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_assignees_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_required: boolean
          procedure_id: string
          remarks: string | null
          sort_order: number
          status: string
          template_item_id: string | null
          text: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_id: string
          remarks?: string | null
          sort_order?: number
          status?: string
          template_item_id?: string | null
          text: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_id?: string
          remarks?: string | null
          sort_order?: number
          status?: string
          template_item_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_checklist_items_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_checklist_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "procedure_template_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_evidence_requirements: {
        Row: {
          allowed_file_types: string[] | null
          created_at: string
          id: string
          is_required: boolean
          procedure_id: string
          sort_order: number
          template_requirement_id: string | null
          title: string
          wp_ref: string | null
        }
        Insert: {
          allowed_file_types?: string[] | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_id: string
          sort_order?: number
          template_requirement_id?: string | null
          title: string
          wp_ref?: string | null
        }
        Update: {
          allowed_file_types?: string[] | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_id?: string
          sort_order?: number
          template_requirement_id?: string | null
          title?: string
          wp_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_evidence_requirements_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_evidence_requirements_template_requirement_id_fkey"
            columns: ["template_requirement_id"]
            isOneToOne: false
            referencedRelation: "procedure_template_evidence_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_template_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          procedure_template_id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_template_id: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_template_id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_template_checklist_items_procedure_template_id_fkey"
            columns: ["procedure_template_id"]
            isOneToOne: false
            referencedRelation: "standard_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_template_evidence_requirements: {
        Row: {
          allowed_file_types: string[] | null
          created_at: string
          id: string
          is_required: boolean
          procedure_template_id: string
          sort_order: number
          title: string
          wp_ref: string | null
        }
        Insert: {
          allowed_file_types?: string[] | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_template_id: string
          sort_order?: number
          title: string
          wp_ref?: string | null
        }
        Update: {
          allowed_file_types?: string[] | null
          created_at?: string
          id?: string
          is_required?: boolean
          procedure_template_id?: string
          sort_order?: number
          title?: string
          wp_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_template_evidence_requirem_procedure_template_id_fkey"
            columns: ["procedure_template_id"]
            isOneToOne: false
            referencedRelation: "standard_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_notes: {
        Row: {
          approval_stage: string
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          content: string
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          prepared_at: string | null
          prepared_by: string | null
          priority: string
          procedure_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          response: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
        }
        Insert: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          content: string
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          priority?: string
          procedure_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Update: {
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          content?: string
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          priority?: string
          procedure_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_notes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_notes_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          audit_response: string | null
          combined_risk: string
          control_risk: string
          created_at: string
          created_by: string
          description: string
          engagement_id: string
          id: string
          inherent_risk: string
          key_controls: string | null
          risk_area: string
          risk_type: string
          status: string
          updated_at: string
        }
        Insert: {
          audit_response?: string | null
          combined_risk?: string
          control_risk?: string
          created_at?: string
          created_by: string
          description: string
          engagement_id: string
          id?: string
          inherent_risk?: string
          key_controls?: string | null
          risk_area: string
          risk_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          audit_response?: string | null
          combined_risk?: string
          control_risk?: string
          created_at?: string
          created_by?: string
          description?: string
          engagement_id?: string
          id?: string
          inherent_risk?: string
          key_controls?: string | null
          risk_area?: string
          risk_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_engine_group_rules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          maps_to_code: string
          maps_to_description: string | null
          notes: string | null
          rule_id: string
          rule_set_id: string
          tally_group_name: string
          tally_parent_group: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          maps_to_code: string
          maps_to_description?: string | null
          notes?: string | null
          rule_id: string
          rule_set_id: string
          tally_group_name: string
          tally_parent_group?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          maps_to_code?: string
          maps_to_description?: string | null
          notes?: string | null
          rule_id?: string
          rule_set_id?: string
          tally_group_name?: string
          tally_parent_group?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_engine_group_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "aile_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_engine_keyword_rules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          keyword_pattern: string
          maps_to_code: string
          maps_to_description: string | null
          match_type: string
          priority: number
          rule_id: string
          rule_set_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          keyword_pattern: string
          maps_to_code: string
          maps_to_description?: string | null
          match_type?: string
          priority?: number
          rule_id: string
          rule_set_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          keyword_pattern?: string
          maps_to_code?: string
          maps_to_description?: string | null
          match_type?: string
          priority?: number
          rule_id?: string
          rule_set_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_engine_keyword_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "aile_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_engine_override_rules: {
        Row: {
          created_at: string
          created_by: string
          current_tally_group: string | null
          effective_date: string | null
          exact_ledger_name: string
          id: string
          is_active: boolean
          override_to_code: string
          override_to_description: string | null
          priority: number
          reason_for_override: string | null
          rule_id: string
          rule_set_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_tally_group?: string | null
          effective_date?: string | null
          exact_ledger_name: string
          id?: string
          is_active?: boolean
          override_to_code: string
          override_to_description?: string | null
          priority?: number
          reason_for_override?: string | null
          rule_id: string
          rule_set_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_tally_group?: string | null
          effective_date?: string | null
          exact_ledger_name?: string
          id?: string
          is_active?: boolean
          override_to_code?: string
          override_to_description?: string | null
          priority?: number
          reason_for_override?: string | null
          rule_id?: string
          rule_set_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_engine_override_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "aile_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_engine_validation_rules: {
        Row: {
          action: string
          condition_description: string
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          rule_id: string
          severity: string
          validation_type: string
        }
        Insert: {
          action: string
          condition_description: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          rule_id: string
          severity?: string
          validation_type: string
        }
        Update: {
          action?: string
          condition_description?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          rule_id?: string
          severity?: string
          validation_type?: string
        }
        Relationships: []
      }
      schedule_iii_config: {
        Row: {
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          include_contingent_liabilities: boolean
          start_note_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          engagement_id: string
          id?: string
          include_contingent_liabilities?: boolean
          start_note_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          include_contingent_liabilities?: boolean
          start_note_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_iii_config_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_procedures: {
        Row: {
          area: string
          assertion: string | null
          checklist_items: Json
          conclusion_prompt: string | null
          created_at: string
          created_by: string
          default_status: string | null
          description: string | null
          evidence_requirements: Json
          id: string
          is_standalone: boolean
          procedure_name: string
          program_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          area: string
          assertion?: string | null
          checklist_items?: Json
          conclusion_prompt?: string | null
          created_at?: string
          created_by: string
          default_status?: string | null
          description?: string | null
          evidence_requirements?: Json
          id?: string
          is_standalone?: boolean
          procedure_name: string
          program_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area?: string
          assertion?: string | null
          checklist_items?: Json
          conclusion_prompt?: string | null
          created_at?: string
          created_by?: string
          default_status?: string | null
          description?: string | null
          evidence_requirements?: Json
          id?: string
          is_standalone?: boolean
          procedure_name?: string
          program_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_procedures_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "standard_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_programs: {
        Row: {
          audit_area: string
          created_at: string
          created_by: string
          description: string | null
          engagement_type: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          audit_area: string
          created_at?: string
          created_by: string
          description?: string | null
          engagement_type?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          audit_area?: string
          created_at?: string
          created_by?: string
          description?: string | null
          engagement_type?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tally_bridge_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          response_data: string | null
          session_code: string
          status: string
          xml_request: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          response_data?: string | null
          session_code: string
          status?: string
          xml_request: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          response_data?: string | null
          session_code?: string
          status?: string
          xml_request?: string
        }
        Relationships: []
      }
      tally_bridge_sessions: {
        Row: {
          connected_at: string
          id: string
          last_heartbeat: string
          session_code: string
          user_id: string | null
        }
        Insert: {
          connected_at?: string
          id?: string
          last_heartbeat?: string
          session_code: string
          user_id?: string | null
        }
        Update: {
          connected_at?: string
          id?: string
          last_heartbeat?: string
          session_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trial_balance_lines: {
        Row: {
          account_code: string
          account_name: string
          aile: string | null
          applied_rule_id: string | null
          applied_rule_type: string | null
          balance_type: string | null
          branch_name: string | null
          closing_balance: number
          created_at: string
          created_by: string
          credit: number
          debit: number
          engagement_id: string
          face_group: string | null
          fs_area: string | null
          id: string
          ledger_parent: string | null
          ledger_primary_group: string | null
          level4_group: string | null
          level5_detail: string | null
          note: string | null
          note_group: string | null
          opening_balance: number
          period_ending: string | null
          period_type: string | null
          schedule_iii_code: string | null
          sub_note: string | null
          updated_at: string
          validation_flags: string[] | null
          version: number
        }
        Insert: {
          account_code: string
          account_name: string
          aile?: string | null
          applied_rule_id?: string | null
          applied_rule_type?: string | null
          balance_type?: string | null
          branch_name?: string | null
          closing_balance?: number
          created_at?: string
          created_by: string
          credit?: number
          debit?: number
          engagement_id: string
          face_group?: string | null
          fs_area?: string | null
          id?: string
          ledger_parent?: string | null
          ledger_primary_group?: string | null
          level4_group?: string | null
          level5_detail?: string | null
          note?: string | null
          note_group?: string | null
          opening_balance?: number
          period_ending?: string | null
          period_type?: string | null
          schedule_iii_code?: string | null
          sub_note?: string | null
          updated_at?: string
          validation_flags?: string[] | null
          version?: number
        }
        Update: {
          account_code?: string
          account_name?: string
          aile?: string | null
          applied_rule_id?: string | null
          applied_rule_type?: string | null
          balance_type?: string | null
          branch_name?: string | null
          closing_balance?: number
          created_at?: string
          created_by?: string
          credit?: number
          debit?: number
          engagement_id?: string
          face_group?: string | null
          fs_area?: string | null
          id?: string
          ledger_parent?: string | null
          ledger_primary_group?: string | null
          level4_group?: string | null
          level5_detail?: string | null
          note?: string | null
          note_group?: string | null
          opening_balance?: number
          period_ending?: string | null
          period_type?: string | null
          schedule_iii_code?: string | null
          sub_note?: string | null
          updated_at?: string
          validation_flags?: string[] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_lines_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_engagement_access: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "partner" | "manager" | "senior" | "staff" | "viewer"
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
      app_role: ["partner", "manager", "senior", "staff", "viewer"],
    },
  },
} as const

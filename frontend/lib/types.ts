/**
 * API Type Definitions
 *
 * TypeScript interfaces for API communication.
 * Includes request/response types for all endpoints.
 *
 * @module lib/types
 */

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth types
export interface RequestOtpRequest {
  telegram_id?: number;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpRequest {
  code: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  message: string;
}

// Portfolio types
export interface PortfolioAbout {
  id: number;
  description: string;
  updated_at: string;
}

export interface PortfolioExperience {
  id: number;
  title: string;
  company: string;
  date_from: string;
  date_to?: string;
  description?: string;
  created_at: string;
}

export interface PortfolioSkill {
  id: number;
  name: string;
  category: string;
  created_at: string;
}

export interface PortfolioContact {
  id: number;
  contact_type: string;
  value: string;
  label?: string;
  created_at: string;
}

export interface PortfolioCase {
  id: number;
  title: string;
  description?: string;
  main_image?: string;
  website_url?: string;
  images: string[];
  created_at: string;
}

export interface FullPortfolio {
  about?: string;
  experience: PortfolioExperience[];
  skills: PortfolioSkill[];
  contacts: PortfolioContact[];
  cases: PortfolioCase[];
}

export interface CreateAboutRequest {
  description: string;
}

export interface UpdateAboutRequest {
  description: string;
}

export interface CreateExperienceRequest {
  title: string;
  company: string;
  date_from: string;
  date_to?: string;
  description?: string;
}

export interface UpdateExperienceRequest {
  title: string;
  company: string;
  date_from: string;
  date_to?: string;
  description?: string;
}

export interface CreateSkillRequest {
  name: string;
  category: string;
}

export interface UpdateSkillRequest {
  name: string;
  category: string;
}

export interface CreateContactRequest {
  contact_type: string;
  value: string;
  label?: string;
}

export interface UpdateContactRequest {
  contact_type: string;
  value: string;
  label?: string;
}

export interface CreateCaseRequest {
  title: string;
  description?: string;
  main_image?: string;
  website_url?: string;
  images: string[];
}

// Job search types
export interface JobVacancy {
  id: number;
  hh_vacancy_id: string;
  title: string;
  company: string;
  salary_from?: number;
  salary_to?: number;
  salary_currency?: string;
  description?: string;
  url: string;
  status: string;
  found_at: string;
  applied_at?: string;
  updated_at: string;
  // AI evaluation fields
  ai_score?: number;
  ai_recommendation?: string;
  ai_priority?: number;
  ai_match_reasons?: string;  // JSON array
  ai_concerns?: string;       // JSON array
  ai_salary_assessment?: string;
}

export interface JobResponse {
  id: number;
  vacancy_id: number;
  hh_negotiation_id?: string;
  cover_letter?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobChat {
  id: number;
  vacancy_id: number;
  hh_chat_id: string;
  employer_name?: string;
  is_bot: boolean;
  is_human_confirmed: boolean;
  telegram_invited: boolean;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobChatMessage {
  id: number;
  chat_id: number;
  hh_message_id?: string;
  author_type: string;
  text: string;
  is_auto_response: boolean;
  ai_sentiment?: string;
  ai_intent?: string;
  created_at: string;
}

export interface ChatWithMessages {
  chat: JobChat;
  messages: JobChatMessage[];
  vacancy_title: string;
  company: string;
}

export interface JobSearchTag {
  id: number;
  tag_type: string;
  value: string;
  is_active: boolean;
  search_count: number;
  found_count: number;
  applied_count: number;
  created_at: string;
}

export interface ActivityLogEntry {
  id: number;
  event_type: string;
  description: string;
  vacancy_title?: string;
  company?: string;
  created_at: string;
}

export interface VacancyWithResponse {
  vacancy: JobVacancy;
  response?: JobResponse;
  chat?: JobChat;
}

export interface JobSearchSettings {
  id: number;
  is_active: boolean;
  search_text: string;
  area_ids?: number[];
  experience?: string;
  schedule?: string;
  employment?: string;
  salary_from?: number;
  only_with_salary: boolean;
  updated_at: string;
  // AI settings
  auto_tags_enabled?: boolean;
  search_tags_json?: string;
  min_ai_score?: number;
  auto_apply_enabled?: boolean;
  search_interval_minutes?: number;
}

export interface SearchStatus {
  is_active: boolean;
  is_authorized: boolean;
  last_search?: string;
  settings?: JobSearchSettings;
  search_tags: JobSearchTag[];
  next_search_at?: string;
}

export interface UpdateSearchSettingsRequest {
  search_text?: string;
  area_ids?: number[];
  experience?: string;
  schedule?: string;
  employment?: string;
  salary_from?: number;
  only_with_salary?: boolean;
  auto_tags_enabled?: boolean;
  min_ai_score?: number;
  auto_apply_enabled?: boolean;
  search_interval_minutes?: number;
}

export interface JobStats {
  total_found: number;
  total_applied: number;
  invited: number;
  rejected: number;
  in_progress: number;
  // Extended stats
  avg_ai_score?: number;
  response_rate?: number;
  active_chats: number;
  telegram_invites_sent: number;
  today_applications: number;
  this_week_applications: number;
}

export interface DailyStats {
  date: string;
  searches_count: number;
  vacancies_found: number;
  applications_sent: number;
  invitations_received: number;
  rejections_received: number;
  messages_sent: number;
  messages_received: number;
  telegram_invites_sent: number;
  avg_ai_score?: number;
}

export interface AITagsResponse {
  primary_tags: string[];
  skill_tags: string[];
  industry_tags: string[];
  suggested_queries: string[];
}

// Link shortener types
export interface ShortLink {
  id: string;
  name: string;
  original_url: string;
  short_code: string;
  external_short_url?: string;
  is_active: boolean;
  redirect_to_studio: boolean;
  set_studio_flag: boolean;
  custom_js?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkClick {
  id: number;
  link_id: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  is_bot: boolean;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  timezone?: string;
  clicked_at: string;
}

export interface LinkStats {
  link: ShortLink;
  total_clicks: number;
  unique_visitors: number;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
  top_countries: { country: string; count: number }[];
  top_browsers: { browser: string; count: number }[];
  top_devices: { device: string; count: number }[];
  clicks_by_day: { date: string; count: number }[];
  recent_clicks: LinkClick[];
}

export interface LinkWithStats {
  link: ShortLink;
  total_clicks: number;
  clicks_today: number;
}

export interface CreateLinkRequest {
  name: string;
  original_url: string;
  redirect_to_studio?: boolean;
  set_studio_flag?: boolean;
  custom_js?: string;
  expires_at?: string;
  use_external_shortener?: boolean;
}

export interface UpdateLinkRequest {
  name?: string;
  original_url?: string;
  is_active?: boolean;
  redirect_to_studio?: boolean;
  set_studio_flag?: boolean;
  custom_js?: string;
  expires_at?: string;
}

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

export interface VacancyWithResponse {
  vacancy: JobVacancy;
  response?: JobResponse;
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
}

export interface SearchStatus {
  is_active: boolean;
  is_authorized: boolean;
  last_search?: string;
  settings?: JobSearchSettings;
}

export interface UpdateSearchSettingsRequest {
  search_text: string;
  area_ids?: number[];
  experience?: string;
  schedule?: string;
  employment?: string;
  salary_from?: number;
  only_with_salary?: boolean;
}

export interface JobStats {
  total_found: number;
  total_applied: number;
  invited: number;
  rejected: number;
  in_progress: number;
}

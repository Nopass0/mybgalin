import axios from "axios";

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NODE_ENV === "production") {
    if (typeof window !== "undefined" && window.location.hostname === "bgalin.ru") {
      return "https://bgalin.ru/api";
    }
    return "http://localhost:3001/api";
  }
  return "http://localhost:3001/api";
};

const t2Api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add T2 auth token to requests
t2Api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("t2_auth_token");
    const storeId = localStorage.getItem("t2_current_store");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (storeId) {
      config.headers["X-Store-Id"] = storeId;
    }
  }
  return config;
});

// Handle auth errors
t2Api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("t2_auth_token");
        localStorage.removeItem("t2_employee");
        localStorage.removeItem("t2_current_store");
        window.location.href = "/t2";
      }
    }
    return Promise.reject(error);
  }
);

export default t2Api;

// Types
export interface T2Store {
  id: number;
  name: string;
  address: string;
  admin_code: string;
  created_at: string;
  updated_at: string;
}

export interface T2Employee {
  id: number;
  store_id: number;
  name: string;
  code: string;
  is_admin: boolean;
  created_at: string;
  stores: T2Store[];
}

export interface T2Category {
  id: number;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface T2Tag {
  id: number;
  store_id: number;
  name: string;
  color: string;
  description: string | null;
  priority: number;
  created_at: string;
}

export interface T2ProductSpec {
  id: number;
  product_id: number;
  spec_name: string;
  spec_value: string;
}

export interface T2Product {
  id: number;
  store_id: number;
  category_id: number;
  category_name: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
  specs: T2ProductSpec[];
  tags: T2Tag[];
  created_at: string;
  updated_at: string;
}

export interface T2Tariff {
  id: number;
  store_id: number;
  name: string;
  price: number;
  minutes: number | null;
  sms: number | null;
  gb: number | null;
  unlimited_t2: boolean;
  unlimited_internet: boolean;
  unlimited_sms: boolean;
  unlimited_calls: boolean;
  unlimited_apps: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface T2Service {
  id: number;
  store_id: number;
  name: string;
  price: number;
  description: string | null;
  for_smartphones_only: boolean;
  created_at: string;
}

export interface T2SaleItem {
  id: number;
  sale_id: number;
  item_type: string;
  item_id: number;
  item_name: string;
  item_details: string | null;
  price: number;
  quantity: number;
  created_at: string;
}

export interface T2Sale {
  id: number;
  store_id: number;
  store_name: string;
  employee_id: number;
  employee_name: string;
  customer_request: string | null;
  customer_audio_url: string | null;
  total_amount: number;
  status: string;
  items: T2SaleItem[];
  created_at: string;
}

export interface ProductRecommendation {
  product: T2Product;
  price_category: "expensive" | "cheap" | "medium";
  match_score: number;
  match_reasons: string[];
}

export interface AccessoryRecommendation {
  product: T2Product;
  reason: string;
  benefit: string;
}

export interface ParsedRequirements {
  budget_min: number | null;
  budget_max: number | null;
  brand_preferences: string[];
  required_features: string[];
  use_cases: string[];
}

export interface AnalyzedPriceTag {
  name: string | null;
  brand: string | null;
  model: string | null;
  price: number | null;
  specs: { name: string; value: string }[];
  raw_text: string;
}

export interface T2Stats {
  products_count: number;
  sales_today: number;
  revenue_today: number;
  total_sales: number;
  total_revenue: number;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// API Functions
export const t2ApiService = {
  // Auth
  async login(code: string, name?: string): Promise<{ token: string; employee: T2Employee }> {
    const res = await t2Api.post<ApiResponse<{ token: string; employee: T2Employee }>>("/t2/auth/login", { code, name });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async logout(): Promise<void> {
    await t2Api.post("/t2/auth/logout");
  },

  async getMe(): Promise<T2Employee> {
    const res = await t2Api.get<ApiResponse<T2Employee>>("/t2/auth/me");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Admin
  async getAdminInfo(): Promise<{ admin_code: string; employee: T2Employee }> {
    const res = await t2Api.get<ApiResponse<{ admin_code: string; employee: T2Employee }>>("/t2/admin/info");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async getStores(): Promise<T2Store[]> {
    const res = await t2Api.get<ApiResponse<T2Store[]>>("/t2/admin/stores");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createStore(name: string, address: string): Promise<T2Store> {
    const res = await t2Api.post<ApiResponse<T2Store>>("/t2/admin/stores", { name, address });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteStore(storeId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/admin/stores/${storeId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  async getEmployees(): Promise<T2Employee[]> {
    const res = await t2Api.get<ApiResponse<T2Employee[]>>("/t2/admin/employees");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createEmployee(storeId: number, name: string): Promise<T2Employee> {
    const res = await t2Api.post<ApiResponse<T2Employee>>("/t2/admin/employees", { store_id: storeId, name });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteEmployee(employeeId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/admin/employees/${employeeId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  // Categories
  async getCategories(): Promise<T2Category[]> {
    const res = await t2Api.get<ApiResponse<T2Category[]>>("/t2/categories");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Tags
  async getTags(): Promise<T2Tag[]> {
    const res = await t2Api.get<ApiResponse<T2Tag[]>>("/t2/tags");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createTag(name: string, color: string, description?: string, priority?: number): Promise<T2Tag> {
    const res = await t2Api.post<ApiResponse<T2Tag>>("/t2/tags", { name, color, description, priority });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async updateTag(tagId: number, data: Partial<{
    name: string;
    color: string;
    description: string;
    priority: number;
  }>): Promise<T2Tag> {
    const res = await t2Api.put<ApiResponse<T2Tag>>(`/t2/tags/${tagId}`, data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteTag(tagId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/tags/${tagId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  // Products
  async getProducts(categoryId?: number, search?: string): Promise<T2Product[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append("category_id", categoryId.toString());
    if (search) params.append("search", search);
    const res = await t2Api.get<ApiResponse<T2Product[]>>(`/t2/products?${params}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async getProduct(productId: number): Promise<T2Product> {
    const res = await t2Api.get<ApiResponse<T2Product>>(`/t2/products/${productId}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createProduct(data: {
    category_id: number;
    name: string;
    brand?: string;
    model?: string;
    price: number;
    quantity?: number;
    image_url?: string;
    specs: { name: string; value: string }[];
    tag_ids: number[];
  }): Promise<T2Product> {
    const res = await t2Api.post<ApiResponse<T2Product>>("/t2/products", data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async updateProduct(productId: number, data: Partial<{
    name: string;
    brand: string;
    model: string;
    price: number;
    quantity: number;
    image_url: string;
    specs: { name: string; value: string }[];
    tag_ids: number[];
  }>): Promise<T2Product> {
    const res = await t2Api.put<ApiResponse<T2Product>>(`/t2/products/${productId}`, data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteProduct(productId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/products/${productId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  // Tariffs
  async getTariffs(): Promise<T2Tariff[]> {
    const res = await t2Api.get<ApiResponse<T2Tariff[]>>("/t2/tariffs");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createTariff(data: {
    name: string;
    price: number;
    minutes?: number;
    sms?: number;
    gb?: number;
    unlimited_t2?: boolean;
    unlimited_internet?: boolean;
    unlimited_sms?: boolean;
    unlimited_calls?: boolean;
    unlimited_apps?: string;
    description?: string;
  }): Promise<T2Tariff> {
    const res = await t2Api.post<ApiResponse<T2Tariff>>("/t2/tariffs", data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async updateTariff(tariffId: number, data: Partial<{
    name: string;
    price: number;
    minutes: number;
    sms: number;
    gb: number;
    unlimited_t2: boolean;
    unlimited_internet: boolean;
    unlimited_sms: boolean;
    unlimited_calls: boolean;
    unlimited_apps: string;
    description: string;
  }>): Promise<T2Tariff> {
    const res = await t2Api.put<ApiResponse<T2Tariff>>(`/t2/tariffs/${tariffId}`, data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteTariff(tariffId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/tariffs/${tariffId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  // Services
  async getServices(): Promise<T2Service[]> {
    const res = await t2Api.get<ApiResponse<T2Service[]>>("/t2/services");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createService(data: {
    name: string;
    price: number;
    description?: string;
    for_smartphones_only?: boolean;
  }): Promise<T2Service> {
    const res = await t2Api.post<ApiResponse<T2Service>>("/t2/services", data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async updateService(serviceId: number, data: Partial<{
    name: string;
    price: number;
    description: string;
    for_smartphones_only: boolean;
  }>): Promise<T2Service> {
    const res = await t2Api.put<ApiResponse<T2Service>>(`/t2/services/${serviceId}`, data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async deleteService(serviceId: number): Promise<void> {
    const res = await t2Api.delete<ApiResponse<void>>(`/t2/services/${serviceId}`);
    if (!res.data.success) throw new Error(res.data.error);
  },

  // AI
  async analyzePriceTag(imageBase64: string): Promise<AnalyzedPriceTag> {
    const res = await t2Api.post<ApiResponse<AnalyzedPriceTag>>("/t2/ai/analyze-price-tag", { image_base64: imageBase64 });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async recommendProducts(text: string): Promise<{ recommendations: ProductRecommendation[]; parsed_requirements: ParsedRequirements }> {
    const res = await t2Api.post<ApiResponse<{ recommendations: ProductRecommendation[]; parsed_requirements: ParsedRequirements }>>("/t2/ai/recommend-products", { text });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async recommendAccessories(productId: number): Promise<AccessoryRecommendation[]> {
    const res = await t2Api.post<ApiResponse<AccessoryRecommendation[]>>(`/t2/ai/recommend-accessories/${productId}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async recommendTariffs(customerNeeds: string, productId?: number): Promise<{ tariff: T2Tariff; recommendation: string }[]> {
    const res = await t2Api.post<ApiResponse<{ tariff: T2Tariff; recommendation: string }[]>>("/t2/ai/recommend-tariffs", { customer_needs: customerNeeds, product_id: productId });
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async isSmartphone(productId: number): Promise<boolean> {
    const res = await t2Api.get<ApiResponse<boolean>>(`/t2/ai/is-smartphone/${productId}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Sales
  async getSales(limit?: number, offset?: number): Promise<T2Sale[]> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    const res = await t2Api.get<ApiResponse<T2Sale[]>>(`/t2/sales?${params}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async getMySales(): Promise<T2Sale[]> {
    const res = await t2Api.get<ApiResponse<T2Sale[]>>("/t2/sales/my");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  async createSale(data: {
    customer_request?: string;
    customer_audio_url?: string;
    items: { item_type: string; item_id: number; quantity?: number }[];
  }): Promise<T2Sale> {
    const res = await t2Api.post<ApiResponse<T2Sale>>("/t2/sales", data);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Search
  async search(query: string): Promise<T2Product[]> {
    const res = await t2Api.get<ApiResponse<T2Product[]>>(`/t2/search?query=${encodeURIComponent(query)}`);
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Stats
  async getStats(): Promise<T2Stats> {
    const res = await t2Api.get<ApiResponse<T2Stats>>("/t2/stats");
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data!;
  },
};

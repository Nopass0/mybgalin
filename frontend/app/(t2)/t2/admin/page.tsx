"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Store,
  Users,
  Tag,
  CreditCard,
  Wrench,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Settings,
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Key,
  ChevronRight,
  X,
  Palette,
} from "lucide-react";
import {
  T2Store,
  T2Employee,
  T2Tag,
  T2Tariff,
  T2Service,
  T2Stats,
  t2ApiService,
} from "@/lib/t2-api";

type Tab = "overview" | "stores" | "employees" | "tags" | "tariffs" | "services";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<T2Stats | null>(null);
  const [stores, setStores] = useState<T2Store[]>([]);
  const [employees, setEmployees] = useState<T2Employee[]>([]);
  const [tags, setTags] = useState<T2Tag[]>([]);
  const [tariffs, setTariffs] = useState<T2Tariff[]>([]);
  const [services, setServices] = useState<T2Service[]>([]);
  const [adminCode, setAdminCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, storesRes, employeesRes, tagsRes, tariffsRes, servicesRes, adminInfo] = await Promise.all([
        t2ApiService.getStats(),
        t2ApiService.getStores(),
        t2ApiService.getEmployees(),
        t2ApiService.getTags(),
        t2ApiService.getTariffs(),
        t2ApiService.getServices(),
        t2ApiService.getAdminInfo(),
      ]);
      setStats(statsRes);
      setStores(storesRes);
      setEmployees(employeesRes);
      setTags(tagsRes);
      setTariffs(tariffsRes);
      setServices(servicesRes);
      setAdminCode(adminInfo.admin_code);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tabs = [
    { id: "overview" as Tab, label: "Обзор", icon: BarChart3 },
    { id: "stores" as Tab, label: "Точки", icon: Store },
    { id: "employees" as Tab, label: "Сотрудники", icon: Users },
    { id: "tags" as Tab, label: "Ярлыки", icon: Tag },
    { id: "tariffs" as Tab, label: "Тарифы", icon: CreditCard },
    { id: "services" as Tab, label: "Услуги", icon: Wrench },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Администрирование</h1>
        <p className="text-gray-500">Управление точкой и сотрудниками</p>
      </div>

      {/* Admin Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-2xl p-6 border border-cyan-500/30 mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center">
              <Key className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Код администратора</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{adminCode}</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(adminCode)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            {copiedCode === adminCode ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? "bg-cyan-500 text-black font-medium"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <OverviewTab
            key="overview"
            stats={stats}
            stores={stores}
            employees={employees}
          />
        )}
        {activeTab === "stores" && (
          <StoresTab
            key="stores"
            stores={stores}
            onUpdate={loadData}
            copyToClipboard={copyToClipboard}
            copiedCode={copiedCode}
          />
        )}
        {activeTab === "employees" && (
          <EmployeesTab
            key="employees"
            employees={employees}
            stores={stores}
            onUpdate={loadData}
            copyToClipboard={copyToClipboard}
            copiedCode={copiedCode}
          />
        )}
        {activeTab === "tags" && (
          <TagsTab key="tags" tags={tags} onUpdate={loadData} />
        )}
        {activeTab === "tariffs" && (
          <TariffsTab key="tariffs" tariffs={tariffs} onUpdate={loadData} />
        )}
        {activeTab === "services" && (
          <ServicesTab key="services" services={services} onUpdate={loadData} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  stats,
  stores,
  employees,
}: {
  stats: T2Stats | null;
  stores: T2Store[];
  employees: T2Employee[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Товаров", value: stats?.products_count || 0, icon: Package, color: "cyan" },
          { label: "Продаж сегодня", value: stats?.sales_today || 0, icon: ShoppingCart, color: "green" },
          { label: "Выручка сегодня", value: `${(stats?.revenue_today || 0).toLocaleString()} ₽`, icon: TrendingUp, color: "yellow" },
          { label: "Всего продаж", value: stats?.total_sales || 0, icon: BarChart3, color: "purple" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 rounded-2xl p-6 border border-gray-800"
          >
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-cyan-500" />
            Точки ({stores.length})
          </h3>
          <div className="space-y-2">
            {stores.slice(0, 5).map((store) => (
              <div key={store.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span>{store.name}</span>
                <span className="text-sm text-gray-500">{store.address}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            Сотрудники ({employees.length})
          </h3>
          <div className="space-y-2">
            {employees.slice(0, 5).map((emp) => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span>{emp.name}</span>
                <span className={`text-sm ${emp.is_admin ? "text-cyan-500" : "text-gray-500"}`}>
                  {emp.is_admin ? "Админ" : "Сотрудник"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-2xl p-6 border border-cyan-500/20">
        <p className="text-sm text-gray-400 mb-2">Общая выручка</p>
        <p className="text-4xl font-bold text-cyan-400">
          {(stats?.total_revenue || 0).toLocaleString()} ₽
        </p>
      </div>
    </motion.div>
  );
}

// Stores Tab
function StoresTab({
  stores,
  onUpdate,
  copyToClipboard,
  copiedCode,
}: {
  stores: T2Store[];
  onUpdate: () => void;
  copyToClipboard: (text: string) => void;
  copiedCode: string | null;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !address) return;
    setIsLoading(true);
    try {
      await t2ApiService.createStore(name, address);
      setName("");
      setAddress("");
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      alert("Ошибка создания точки");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (storeId: number) => {
    if (!confirm("Удалить точку? Все товары и сотрудники будут удалены.")) return;
    try {
      await t2ApiService.deleteStore(storeId);
      onUpdate();
    } catch (e: any) {
      alert(e.message || "Ошибка удаления");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить точку
        </button>
      )}

      {/* Add Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-2xl p-6 border border-cyan-500/30 space-y-4"
        >
          <input
            type="text"
            placeholder="Название точки"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <input
            type="text"
            placeholder="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !name || !address}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать
            </button>
          </div>
        </motion.div>
      )}

      {/* Stores List */}
      {stores.map((store) => (
        <div
          key={store.id}
          className="bg-white/5 rounded-2xl p-6 border border-gray-800"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{store.name}</h3>
              <p className="text-sm text-gray-500">{store.address}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(store.admin_code)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="font-mono text-cyan-400">{store.admin_code}</span>
                {copiedCode === store.admin_code ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {store.id !== 1 && (
                <button
                  onClick={() => handleDelete(store.id)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Employees Tab
function EmployeesTab({
  employees,
  stores,
  onUpdate,
  copyToClipboard,
  copiedCode,
}: {
  employees: T2Employee[];
  stores: T2Store[];
  onUpdate: () => void;
  copyToClipboard: (text: string) => void;
  copiedCode: string | null;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !storeId) return;
    setIsLoading(true);
    try {
      await t2ApiService.createEmployee(storeId, name);
      setName("");
      setStoreId(null);
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      alert("Ошибка создания сотрудника");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (employeeId: number) => {
    if (!confirm("Удалить сотрудника?")) return;
    try {
      await t2ApiService.deleteEmployee(employeeId);
      onUpdate();
    } catch (e: any) {
      alert(e.message || "Ошибка удаления");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить сотрудника
        </button>
      )}

      {/* Add Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-2xl p-6 border border-cyan-500/30 space-y-4"
        >
          <input
            type="text"
            placeholder="Имя сотрудника"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <select
            value={storeId || ""}
            onChange={(e) => setStoreId(parseInt(e.target.value) || null)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          >
            <option value="">Выберите точку</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !name || !storeId}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать
            </button>
          </div>
        </motion.div>
      )}

      {/* Employees List */}
      {employees.map((emp) => {
        const store = stores.find((s) => s.id === emp.store_id);
        return (
          <div
            key={emp.id}
            className="bg-white/5 rounded-2xl p-6 border border-gray-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{emp.name}</h3>
                  {emp.is_admin && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                      Админ
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{store?.name || "Неизвестная точка"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(emp.code)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="font-mono text-cyan-400">{emp.code}</span>
                  {copiedCode === emp.code ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                {!emp.is_admin && (
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// Tags Tab
function TagsTab({ tags, onUpdate }: { tags: T2Tag[]; onUpdate: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00bcd4");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) return;
    setIsLoading(true);
    try {
      await t2ApiService.createTag(name, color, description || undefined);
      setName("");
      setColor("#00bcd4");
      setDescription("");
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      alert("Ошибка создания ярлыка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm("Удалить ярлык?")) return;
    try {
      await t2ApiService.deleteTag(tagId);
      onUpdate();
    } catch (e) {
      alert("Ошибка удаления");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить ярлык
        </button>
      )}

      {/* Add Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-2xl p-6 border border-cyan-500/30 space-y-4"
        >
          <input
            type="text"
            placeholder="Название ярлыка"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Цвет</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer"
                />
                <span className="font-mono text-sm">{color}</span>
              </div>
            </div>
          </div>
          <textarea
            placeholder="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !name}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать
            </button>
          </div>
        </motion.div>
      )}

      {/* Tags Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="bg-white/5 rounded-xl p-4 border border-gray-800 relative group"
          >
            <button
              onClick={() => handleDelete(tag.id)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div
              className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{ backgroundColor: tag.color + "30" }}
            >
              <Tag className="w-5 h-5" style={{ color: tag.color }} />
            </div>
            <h3 className="font-medium" style={{ color: tag.color }}>
              {tag.name}
            </h3>
            {tag.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tag.description}</p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Tariffs Tab
function TariffsTab({ tariffs, onUpdate }: { tariffs: T2Tariff[]; onUpdate: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    minutes: "",
    sms: "",
    gb: "",
    unlimited_t2: false,
    unlimited_internet: false,
    unlimited_sms: false,
    unlimited_calls: false,
    unlimited_apps: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.price) return;
    setIsLoading(true);
    try {
      await t2ApiService.createTariff({
        name: form.name,
        price: parseFloat(form.price),
        minutes: form.minutes ? parseInt(form.minutes) : undefined,
        sms: form.sms ? parseInt(form.sms) : undefined,
        gb: form.gb ? parseInt(form.gb) : undefined,
        unlimited_t2: form.unlimited_t2,
        unlimited_internet: form.unlimited_internet,
        unlimited_sms: form.unlimited_sms,
        unlimited_calls: form.unlimited_calls,
        unlimited_apps: form.unlimited_apps || undefined,
        description: form.description || undefined,
      });
      setForm({
        name: "",
        price: "",
        minutes: "",
        sms: "",
        gb: "",
        unlimited_t2: false,
        unlimited_internet: false,
        unlimited_sms: false,
        unlimited_calls: false,
        unlimited_apps: "",
        description: "",
      });
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      alert("Ошибка создания тарифа");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tariffId: number) => {
    if (!confirm("Удалить тариф?")) return;
    try {
      await t2ApiService.deleteTariff(tariffId);
      onUpdate();
    } catch (e) {
      alert("Ошибка удаления");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить тариф
        </button>
      )}

      {/* Add Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-2xl p-6 border border-cyan-500/30 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Название тарифа"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="col-span-2 px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
            />
            <input
              type="number"
              placeholder="Цена (₽/мес)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
            />
            <input
              type="number"
              placeholder="Минуты"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              className="px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
            />
            <input
              type="number"
              placeholder="SMS"
              value={form.sms}
              onChange={(e) => setForm({ ...form, sms: e.target.value })}
              className="px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
            />
            <input
              type="number"
              placeholder="ГБ интернета"
              value={form.gb}
              onChange={(e) => setForm({ ...form, gb: e.target.value })}
              className="px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { key: "unlimited_t2", label: "Безлимит T2" },
              { key: "unlimited_internet", label: "Безлимит интернет" },
              { key: "unlimited_sms", label: "Безлимит SMS" },
              { key: "unlimited_calls", label: "Безлимит звонки" },
            ].map((opt) => (
              <label
                key={opt.key}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${
                  form[opt.key as keyof typeof form]
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/5 text-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form[opt.key as keyof typeof form] as boolean}
                  onChange={(e) =>
                    setForm({ ...form, [opt.key]: e.target.checked })
                  }
                  className="hidden"
                />
                {form[opt.key as keyof typeof form] ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 rounded border border-gray-600" />
                )}
                {opt.label}
              </label>
            ))}
          </div>

          <input
            type="text"
            placeholder="Безлимит на приложения (Telegram, WhatsApp...)"
            value={form.unlimited_apps}
            onChange={(e) => setForm({ ...form, unlimited_apps: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />

          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !form.name || !form.price}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать
            </button>
          </div>
        </motion.div>
      )}

      {/* Tariffs List */}
      {tariffs.map((tariff) => (
        <div
          key={tariff.id}
          className="bg-white/5 rounded-2xl p-6 border border-gray-800"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{tariff.name}</h3>
              <p className="text-2xl font-bold text-cyan-400">
                {tariff.price.toLocaleString()} ₽/мес
              </p>
            </div>
            <button
              onClick={() => handleDelete(tariff.id)}
              className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-black/30">
              <p className="text-xl font-bold">
                {tariff.unlimited_calls ? "∞" : tariff.minutes || 0}
              </p>
              <p className="text-xs text-gray-500">минут</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/30">
              <p className="text-xl font-bold">
                {tariff.unlimited_internet ? "∞" : tariff.gb || 0}
              </p>
              <p className="text-xs text-gray-500">ГБ</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/30">
              <p className="text-xl font-bold">
                {tariff.unlimited_sms ? "∞" : tariff.sms || 0}
              </p>
              <p className="text-xs text-gray-500">SMS</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tariff.unlimited_t2 && (
              <span className="px-2 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-400">
                Безлимит T2
              </span>
            )}
            {tariff.unlimited_apps && (
              <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-400">
                {tariff.unlimited_apps}
              </span>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Services Tab
function ServicesTab({ services, onUpdate }: { services: T2Service[]; onUpdate: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    for_smartphones_only: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.price) return;
    setIsLoading(true);
    try {
      await t2ApiService.createService({
        name: form.name,
        price: parseFloat(form.price),
        description: form.description || undefined,
        for_smartphones_only: form.for_smartphones_only,
      });
      setForm({ name: "", price: "", description: "", for_smartphones_only: false });
      setIsAdding(false);
      onUpdate();
    } catch (e) {
      alert("Ошибка создания услуги");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (serviceId: number) => {
    if (!confirm("Удалить услугу?")) return;
    try {
      await t2ApiService.deleteService(serviceId);
      onUpdate();
    } catch (e) {
      alert("Ошибка удаления");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить услугу
        </button>
      )}

      {/* Add Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-2xl p-6 border border-cyan-500/30 space-y-4"
        >
          <input
            type="text"
            placeholder="Название услуги"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <input
            type="number"
            placeholder="Цена (₽)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none"
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none resize-none"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.for_smartphones_only}
              onChange={(e) =>
                setForm({ ...form, for_smartphones_only: e.target.checked })
              }
              className="w-4 h-4 rounded bg-black/30 border-gray-700"
            />
            <span className="text-sm text-gray-400">Только для смартфонов</span>
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !form.name || !form.price}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Создать
            </button>
          </div>
        </motion.div>
      )}

      {/* Services List */}
      {services.map((service) => (
        <div
          key={service.id}
          className="bg-white/5 rounded-2xl p-6 border border-gray-800"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{service.name}</h3>
                {service.for_smartphones_only && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                    Смартфоны
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-sm text-gray-500">{service.description}</p>
              )}
              <p className="text-xl font-bold text-cyan-400 mt-2">
                {service.price.toLocaleString()} ₽
              </p>
            </div>
            <button
              onClick={() => handleDelete(service.id)}
              className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

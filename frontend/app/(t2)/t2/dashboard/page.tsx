"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Smartphone,
  Headphones,
  CreditCard,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { T2Sale, T2Stats, t2ApiService } from "@/lib/t2-api";

interface CategoryStats {
  name: string;
  sales: number;
  revenue: number;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<T2Stats | null>(null);
  const [mySales, setMySales] = useState<T2Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, salesData] = await Promise.all([
        t2ApiService.getStats(),
        t2ApiService.getMySales(),
      ]);
      setStats(statsData);
      setMySales(salesData);

      // Calculate category stats from sales
      const catStats: Record<string, { sales: number; revenue: number }> = {
        smartphone: { sales: 0, revenue: 0 },
        accessory: { sales: 0, revenue: 0 },
        tariff: { sales: 0, revenue: 0 },
        service: { sales: 0, revenue: 0 },
      };

      salesData.forEach((sale) => {
        sale.items.forEach((item) => {
          if (item.item_type === "product") {
            // Try to determine category from item name
            const nameLower = item.item_name.toLowerCase();
            if (
              nameLower.includes("phone") ||
              nameLower.includes("смартфон") ||
              nameLower.includes("iphone") ||
              nameLower.includes("galaxy") ||
              nameLower.includes("redmi") ||
              nameLower.includes("xiaomi")
            ) {
              catStats.smartphone.sales += item.quantity;
              catStats.smartphone.revenue += item.price * item.quantity;
            } else {
              catStats.accessory.sales += item.quantity;
              catStats.accessory.revenue += item.price * item.quantity;
            }
          } else if (item.item_type === "tariff") {
            catStats.tariff.sales += item.quantity;
            catStats.tariff.revenue += item.price * item.quantity;
          } else if (item.item_type === "service") {
            catStats.service.sales += item.quantity;
            catStats.service.revenue += item.price * item.quantity;
          }
        });
      });

      setCategoryStats([
        {
          name: "Смартфоны",
          sales: catStats.smartphone.sales,
          revenue: catStats.smartphone.revenue,
          icon: <Smartphone className="w-5 h-5" />,
          color: "#06b6d4",
        },
        {
          name: "Аксессуары",
          sales: catStats.accessory.sales,
          revenue: catStats.accessory.revenue,
          icon: <Headphones className="w-5 h-5" />,
          color: "#8b5cf6",
        },
        {
          name: "Тарифы",
          sales: catStats.tariff.sales,
          revenue: catStats.tariff.revenue,
          icon: <CreditCard className="w-5 h-5" />,
          color: "#22c55e",
        },
        {
          name: "Услуги",
          sales: catStats.service.sales,
          revenue: catStats.service.revenue,
          icon: <Package className="w-5 h-5" />,
          color: "#f59e0b",
        },
      ]);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate today's stats from my sales
  const today = new Date().toISOString().split("T")[0];
  const todaySales = mySales.filter((sale) =>
    sale.created_at.startsWith(today)
  );
  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + sale.total_amount,
    0
  );
  const todayCount = todaySales.length;

  // Total from my sales
  const totalRevenue = mySales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalCount = mySales.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const maxRevenue = Math.max(...categoryStats.map((c) => c.revenue), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Кабинет сотрудника</h1>
        <p className="text-gray-500">Ваша статистика и история продаж</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-2xl p-6 border border-cyan-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-cyan-500" />
            </div>
            <span className="text-gray-400 text-sm">Заработано сегодня</span>
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {todayRevenue.toLocaleString()} ₽
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl p-6 border border-purple-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-sm">Продаж сегодня</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">{todayCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl p-6 border border-green-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-sm">Всего выручка</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {totalRevenue.toLocaleString()} ₽
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-6 border border-amber-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-gray-400 text-sm">Всего продаж</span>
          </div>
          <div className="text-3xl font-bold text-amber-400">{totalCount}</div>
        </motion.div>
      </div>

      {/* Category Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 rounded-2xl border border-gray-800 p-6 mb-8"
      >
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-500" />
          Выручка по категориям
        </h2>
        <div className="space-y-4">
          {categoryStats.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                  </div>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: cat.color }}>
                    {cat.revenue.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-gray-500">{cat.sales} продаж</div>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.revenue / maxRevenue) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sales History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 rounded-2xl border border-gray-800 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-500" />
            История продаж
          </h2>
        </div>

        {mySales.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Нет продаж
            </h3>
            <p className="text-gray-600">
              Ваши продажи будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {mySales.slice(0, 20).map((sale) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <div className="font-medium">
                        Продажа #{sale.id}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(sale.created_at).toLocaleDateString("ru-RU")}
                        <Clock className="w-3 h-3 ml-2" />
                        {new Date(sale.created_at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-400">
                      {sale.total_amount.toLocaleString()} ₽
                    </div>
                    <div className="text-xs text-gray-500">
                      {sale.items.length} позиций
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-3 pl-13 space-y-1">
                  {sale.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300">{item.item_name}</span>
                        {item.quantity > 1 && (
                          <span className="text-gray-500">×{item.quantity}</span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {(item.price * item.quantity).toLocaleString()} ₽
                      </span>
                    </div>
                  ))}
                </div>

                {/* Customer request */}
                {sale.customer_request && (
                  <div className="mt-2 pl-13">
                    <div className="text-xs text-gray-500 italic">
                      "{sale.customer_request}"
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {mySales.length > 20 && (
          <div className="p-4 border-t border-gray-800 text-center">
            <span className="text-sm text-gray-500">
              Показано 20 из {mySales.length} продаж
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

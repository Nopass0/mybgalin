"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Store,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
} from "lucide-react";
import { T2Employee, T2Store, t2ApiService } from "@/lib/t2-api";

export default function T2Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [employee, setEmployee] = useState<T2Employee | null>(null);
  const [currentStore, setCurrentStore] = useState<T2Store | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("t2_employee");
    const token = localStorage.getItem("t2_auth_token");
    const storeId = localStorage.getItem("t2_current_store");

    if (!token) {
      setIsLoading(false);
      if (pathname !== "/t2") {
        router.push("/t2");
      }
      return;
    }

    if (stored) {
      const emp = JSON.parse(stored) as T2Employee;
      setEmployee(emp);
      const store = storeId
        ? emp.stores.find((s) => s.id === parseInt(storeId)) || emp.stores[0]
        : emp.stores[0];
      setCurrentStore(store);
    }

    setIsLoading(false);
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await t2ApiService.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("t2_auth_token");
    localStorage.removeItem("t2_employee");
    localStorage.removeItem("t2_current_store");
    router.push("/t2");
  };

  const handleStoreChange = (store: T2Store) => {
    setCurrentStore(store);
    localStorage.setItem("t2_current_store", store.id.toString());
    setIsStoreDropdownOpen(false);
    window.location.reload();
  };

  const navItems = [
    { href: "/t2/catalog", icon: Package, label: "Каталог" },
    { href: "/t2/sale", icon: ShoppingCart, label: "Продажа" },
    ...(employee?.is_admin ? [{ href: "/t2/admin", icon: Settings, label: "Админ" }] : []),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Login page - no navigation
  if (pathname === "/t2" || !employee) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
              T2 Sales
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <motion.button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-cyan-500 text-black font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </motion.button>
              );
            })}
          </nav>

          {/* Store Selector & User */}
          <div className="hidden md:flex items-center gap-4">
            {/* Store Selector */}
            {employee.stores.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Store className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm truncate max-w-[150px]">{currentStore?.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isStoreDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isStoreDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] rounded-xl border border-cyan-500/20 shadow-xl overflow-hidden"
                    >
                      {employee.stores.map((store) => (
                        <button
                          key={store.id}
                          onClick={() => handleStoreChange(store)}
                          className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                            store.id === currentStore?.id ? "bg-cyan-500/10 text-cyan-400" : ""
                          }`}
                        >
                          <div className="font-medium">{store.name}</div>
                          <div className="text-xs text-gray-500">{store.address}</div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">{employee.name}</div>
                <div className="text-xs text-gray-500">
                  {employee.is_admin ? "Администратор" : "Сотрудник"}
                </div>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 bg-[#0a0a0a]/98 backdrop-blur-xl border-b border-cyan-500/20 md:hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-cyan-500 text-black font-medium"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}

              {/* Store selector for mobile */}
              {employee.stores.length > 1 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-gray-500 px-4 py-2">Выбрать точку</div>
                  {employee.stores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => handleStoreChange(store)}
                      className={`w-full px-4 py-3 text-left rounded-xl transition-colors ${
                        store.id === currentStore?.id
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              )}

              {/* User info and logout */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-gray-500">
                        {employee.is_admin ? "Администратор" : "Сотрудник"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-red-500/10 text-red-500"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Wifi,
  Headphones,
  ChevronRight,
  Check,
  X,
  Loader2,
  ShoppingCart,
  Star,
  Zap,
  Shield,
  Battery,
  Camera,
  Cpu,
  HardDrive,
  Phone,
  MessageSquare,
  Globe,
  ArrowRight,
  RotateCcw,
  Plus,
  Minus,
  CreditCard,
  Gift,
  TrendingUp,
  Users,
  ThumbsUp,
} from "lucide-react";
import {
  T2Product,
  T2Tariff,
  T2Service,
  t2ApiService,
  AccessoryRecommendation,
} from "@/lib/t2-api";

type StartWith = "phone" | "tariff" | "accessory" | null;
type ScriptStep = "start" | "select" | "pitch" | "upsell" | "services" | "summary";

interface QuickQuestion {
  question: string;
  answers: { text: string; action: () => void }[];
}

export default function ScriptSalePage() {
  const [startWith, setStartWith] = useState<StartWith>(null);
  const [step, setStep] = useState<ScriptStep>("start");
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [products, setProducts] = useState<T2Product[]>([]);
  const [tariffs, setTariffs] = useState<T2Tariff[]>([]);
  const [services, setServices] = useState<T2Service[]>([]);
  const [accessoryRecommendations, setAccessoryRecommendations] = useState<AccessoryRecommendation[]>([]);

  // Selected items
  const [selectedPhone, setSelectedPhone] = useState<T2Product | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<T2Tariff | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<T2Product[]>([]);
  const [selectedServices, setSelectedServices] = useState<T2Service[]>([]);

  // Quick questions state
  const [currentQuestion, setCurrentQuestion] = useState<QuickQuestion | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, trfs, svcs] = await Promise.all([
        t2ApiService.getProducts(1), // Phones category
        t2ApiService.getTariffs(),
        t2ApiService.getServices(),
      ]);
      setProducts(prods);
      setTariffs(trfs);
      setServices(svcs);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWith = (type: StartWith) => {
    setStartWith(type);
    setStep("select");
  };

  const handleSelectPhone = async (phone: T2Product) => {
    setSelectedPhone(phone);
    setIsLoading(true);

    try {
      // Get accessory recommendations
      const accessories = await t2ApiService.recommendAccessories(phone.id);
      setAccessoryRecommendations(accessories);
    } catch (e) {
      console.error("Failed to get accessories:", e);
    } finally {
      setIsLoading(false);
    }

    setStep("pitch");
  };

  const handleSelectTariff = (tariff: T2Tariff) => {
    setSelectedTariff(tariff);
    setStep("pitch");
  };

  const handleSelectAccessory = (accessory: T2Product) => {
    if (selectedAccessories.find(a => a.id === accessory.id)) {
      setSelectedAccessories(selectedAccessories.filter(a => a.id !== accessory.id));
    } else {
      setSelectedAccessories([...selectedAccessories, accessory]);
    }
  };

  const handleGoToUpsell = () => {
    if (startWith === "phone" && tariffs.length > 0) {
      setCurrentQuestion({
        question: "Клиент пользуется Tele2?",
        answers: [
          { text: "Да, уже абонент", action: () => { setCurrentQuestion(null); setStep("services"); } },
          { text: "Нет, хочет перейти", action: () => { setCurrentQuestion(null); setStep("upsell"); } },
          { text: "Не интересует", action: () => { setCurrentQuestion(null); setStep("services"); } },
        ],
      });
    } else if (startWith === "tariff") {
      setCurrentQuestion({
        question: "Клиенту нужен новый телефон?",
        answers: [
          { text: "Да, подберём", action: () => { setStartWith("phone"); setStep("select"); } },
          { text: "Нет, есть свой", action: () => { setStep("summary"); } },
        ],
      });
    } else {
      setStep("services");
    }
  };

  const handleAddService = (service: T2Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const completeSale = async () => {
    setIsLoading(true);
    try {
      const items: { item_type: string; item_id: number; quantity?: number }[] = [];

      if (selectedPhone) {
        items.push({ item_type: "product", item_id: selectedPhone.id });
      }
      if (selectedTariff) {
        items.push({ item_type: "tariff", item_id: selectedTariff.id });
      }
      for (const acc of selectedAccessories) {
        items.push({ item_type: "product", item_id: acc.id });
      }
      for (const svc of selectedServices) {
        items.push({ item_type: "service", item_id: svc.id });
      }

      if (items.length > 0) {
        await t2ApiService.createSale({ items });
        alert("Продажа успешно завершена!");
      }

      resetSale();
    } catch (e) {
      console.error("Failed to create sale:", e);
      alert("Ошибка создания продажи");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSale = () => {
    setStartWith(null);
    setStep("start");
    setSelectedPhone(null);
    setSelectedTariff(null);
    setSelectedAccessories([]);
    setSelectedServices([]);
    setAccessoryRecommendations([]);
    setCurrentQuestion(null);
  };

  const calculateTotal = () => {
    let total = 0;
    if (selectedPhone) total += selectedPhone.price;
    if (selectedTariff) total += selectedTariff.price;
    for (const acc of selectedAccessories) total += acc.price;
    for (const svc of selectedServices) total += svc.price;
    return total;
  };

  const getPhoneSellingPoints = (phone: T2Product) => {
    const points: { icon: React.ReactNode; text: string; highlight?: boolean }[] = [];

    for (const spec of phone.specs) {
      const name = spec.spec_name.toLowerCase();
      const value = spec.spec_value;

      if (name.includes("камер") || name.includes("camera")) {
        points.push({ icon: <Camera className="w-4 h-4" />, text: `Камера ${value}`, highlight: value.includes("МП") && parseInt(value) >= 50 });
      }
      if (name.includes("экран") || name.includes("display") || name.includes("диагональ")) {
        points.push({ icon: <Smartphone className="w-4 h-4" />, text: `Экран ${value}` });
      }
      if (name.includes("процессор") || name.includes("cpu") || name.includes("чип")) {
        points.push({ icon: <Cpu className="w-4 h-4" />, text: `${value}`, highlight: value.toLowerCase().includes("snapdragon 8") });
      }
      if (name.includes("память") || name.includes("storage") || name.includes("встроен")) {
        points.push({ icon: <HardDrive className="w-4 h-4" />, text: `Память ${value}` });
      }
      if (name.includes("аккумулятор") || name.includes("батарея") || name.includes("battery")) {
        points.push({ icon: <Battery className="w-4 h-4" />, text: `Батарея ${value}`, highlight: value.includes("5000") || value.includes("6000") });
      }
    }

    return points.slice(0, 5);
  };

  const getTariffSellingPoints = (tariff: T2Tariff) => {
    const points: { icon: React.ReactNode; text: string; highlight?: boolean }[] = [];

    if (tariff.unlimited_internet) {
      points.push({ icon: <Globe className="w-4 h-4" />, text: "Безлимитный интернет", highlight: true });
    } else if (tariff.gb) {
      points.push({ icon: <Globe className="w-4 h-4" />, text: `${tariff.gb} ГБ интернета`, highlight: tariff.gb >= 30 });
    }

    if (tariff.unlimited_calls) {
      points.push({ icon: <Phone className="w-4 h-4" />, text: "Безлимитные звонки", highlight: true });
    } else if (tariff.minutes) {
      points.push({ icon: <Phone className="w-4 h-4" />, text: `${tariff.minutes} минут` });
    }

    if (tariff.unlimited_sms) {
      points.push({ icon: <MessageSquare className="w-4 h-4" />, text: "Безлимитные SMS", highlight: true });
    } else if (tariff.sms) {
      points.push({ icon: <MessageSquare className="w-4 h-4" />, text: `${tariff.sms} SMS` });
    }

    if (tariff.unlimited_t2) {
      points.push({ icon: <Users className="w-4 h-4" />, text: "Безлимит на Tele2", highlight: true });
    }

    if (tariff.unlimited_apps) {
      points.push({ icon: <Zap className="w-4 h-4" />, text: `Безлимит: ${tariff.unlimited_apps}` });
    }

    return points;
  };

  if (isLoading && step === "start") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Скрипт продаж</h1>
          <p className="text-gray-500">Пошаговый помощник для максимальных продаж</p>
        </div>
        {step !== "start" && (
          <button
            onClick={resetSale}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Сначала
          </button>
        )}
      </div>

      {/* Cart Preview (when items selected) */}
      {(selectedPhone || selectedTariff || selectedAccessories.length > 0) && step !== "summary" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-cyan-500" />
              <span className="font-medium">
                В корзине: {[selectedPhone, selectedTariff, ...selectedAccessories].filter(Boolean).length} товаров
              </span>
            </div>
            <span className="text-xl font-bold text-cyan-400">
              {calculateTotal().toLocaleString()} ₽
            </span>
          </div>
        </motion.div>
      )}

      {/* Quick Question Modal */}
      <AnimatePresence>
        {currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#111] rounded-3xl border border-cyan-500/30 p-6"
            >
              <h3 className="text-xl font-bold text-center mb-6">{currentQuestion.question}</h3>
              <div className="space-y-3">
                {currentQuestion.answers.map((answer, i) => (
                  <motion.button
                    key={i}
                    onClick={answer.action}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 px-6 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500 transition-all text-left font-medium"
                  >
                    {answer.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Step: Start - Choose what to sell */}
        {step === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2">С чего начнём?</h2>
              <p className="text-gray-500">Выберите, что хочет клиент</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  type: "phone" as StartWith,
                  icon: Smartphone,
                  title: "Телефон",
                  description: "Клиент ищет новый телефон",
                  color: "cyan",
                },
                {
                  type: "tariff" as StartWith,
                  icon: Wifi,
                  title: "Тариф",
                  description: "Клиент хочет подключиться",
                  color: "blue",
                },
                {
                  type: "accessory" as StartWith,
                  icon: Headphones,
                  title: "Аксессуар",
                  description: "Клиент ищет аксессуары",
                  color: "purple",
                },
              ].map((item) => (
                <motion.button
                  key={item.type}
                  onClick={() => handleStartWith(item.type)}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-2xl border transition-all text-left
                    ${item.color === "cyan" ? "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500" : ""}
                    ${item.color === "blue" ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500" : ""}
                    ${item.color === "purple" ? "bg-purple-500/10 border-purple-500/30 hover:border-purple-500" : ""}
                  `}
                >
                  <item.icon className={`w-10 h-10 mb-4
                    ${item.color === "cyan" ? "text-cyan-500" : ""}
                    ${item.color === "blue" ? "text-blue-500" : ""}
                    ${item.color === "purple" ? "text-purple-500" : ""}
                  `} />
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </motion.button>
              ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-800">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{products.length}</p>
                <p className="text-sm text-gray-500">телефонов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{tariffs.length}</p>
                <p className="text-sm text-gray-500">тарифов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{services.length}</p>
                <p className="text-sm text-gray-500">услуг</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step: Select - Choose product */}
        {step === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">
                {startWith === "phone" && "Выберите телефон"}
                {startWith === "tariff" && "Выберите тариф"}
                {startWith === "accessory" && "Выберите аксессуар"}
              </h2>
              <p className="text-gray-500">Нажмите на товар для продолжения</p>
            </div>

            {/* Phones */}
            {startWith === "phone" && (
              <div className="grid gap-4">
                {products.map((phone, index) => (
                  <motion.div
                    key={phone.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectPhone(phone)}
                    className="bg-white/5 rounded-2xl p-4 border border-gray-800 hover:border-cyan-500 cursor-pointer transition-all group"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-black/30 flex-shrink-0 overflow-hidden">
                        {phone.image_url ? (
                          <img src={phone.image_url} alt={phone.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Smartphone className="w-8 h-8 text-gray-700" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            {phone.brand && <p className="text-xs text-cyan-500">{phone.brand}</p>}
                            <h3 className="font-semibold truncate">{phone.name}</h3>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-500 transition-colors" />
                        </div>
                        <p className="text-xl font-bold text-cyan-400 mt-1">
                          {phone.price.toLocaleString()} ₽
                        </p>
                        {phone.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {phone.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ backgroundColor: tag.color + "30", color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Tariffs */}
            {startWith === "tariff" && (
              <div className="grid gap-4">
                {tariffs.map((tariff, index) => (
                  <motion.div
                    key={tariff.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectTariff(tariff)}
                    className="bg-white/5 rounded-2xl p-6 border border-gray-800 hover:border-blue-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{tariff.name}</h3>
                        <p className="text-2xl font-bold text-blue-400">{tariff.price} ₽/мес</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-black/30">
                        <p className="text-lg font-bold">{tariff.unlimited_calls ? "∞" : tariff.minutes || 0}</p>
                        <p className="text-xs text-gray-500">мин</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-black/30">
                        <p className="text-lg font-bold">{tariff.unlimited_internet ? "∞" : tariff.gb || 0}</p>
                        <p className="text-xs text-gray-500">ГБ</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-black/30">
                        <p className="text-lg font-bold">{tariff.unlimited_sms ? "∞" : tariff.sms || 0}</p>
                        <p className="text-xs text-gray-500">SMS</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Accessories */}
            {startWith === "accessory" && (
              <>
                <div className="grid gap-4">
                  {products.filter(p => p.category_id === 2).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Аксессуары не найдены</p>
                    </div>
                  ) : (
                    products.filter(p => p.category_id === 2).map((acc, index) => {
                      const isSelected = selectedAccessories.some(a => a.id === acc.id);
                      return (
                        <motion.div
                          key={acc.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSelectAccessory(acc)}
                          className={`bg-white/5 rounded-2xl p-4 border cursor-pointer transition-all ${
                            isSelected ? "border-purple-500 bg-purple-500/10" : "border-gray-800 hover:border-purple-500"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-black/30 flex items-center justify-center">
                              <Headphones className="w-8 h-8 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{acc.name}</h3>
                              <p className="text-lg font-bold text-purple-400">{acc.price.toLocaleString()} ₽</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? "border-purple-500 bg-purple-500" : "border-gray-600"
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
                {selectedAccessories.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setStep("services")}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold"
                  >
                    Продолжить с {selectedAccessories.length} аксессуарами
                  </motion.button>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Step: Pitch - Show selling points */}
        {step === "pitch" && (
          <motion.div
            key="pitch"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Phone Pitch */}
            {selectedPhone && startWith === "phone" && (
              <>
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl p-6 border border-cyan-500/30">
                  <div className="flex gap-4 mb-6">
                    <div className="w-24 h-24 rounded-xl bg-black/30 overflow-hidden flex-shrink-0">
                      {selectedPhone.image_url ? (
                        <img src={selectedPhone.image_url} alt={selectedPhone.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Smartphone className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-cyan-500">{selectedPhone.brand}</p>
                      <h2 className="text-xl font-bold">{selectedPhone.name}</h2>
                      <p className="text-3xl font-bold text-cyan-400 mt-1">
                        {selectedPhone.price.toLocaleString()} ₽
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Сильные стороны (расскажите клиенту)
                    </h3>
                    <div className="space-y-2">
                      {getPhoneSellingPoints(selectedPhone).map((point, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            point.highlight ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-white/5"
                          }`}
                        >
                          <span className={point.highlight ? "text-cyan-400" : "text-gray-400"}>
                            {point.icon}
                          </span>
                          <span className={point.highlight ? "font-medium" : ""}>{point.text}</span>
                          {point.highlight && (
                            <span className="ml-auto text-xs bg-cyan-500 text-black px-2 py-0.5 rounded">TOP</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick speech */}
                  <div className="p-4 rounded-xl bg-black/30 border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Скажите клиенту:</p>
                    <p className="italic">
                      "Отличный выбор! {selectedPhone.name} - это{" "}
                      {getPhoneSellingPoints(selectedPhone).filter(p => p.highlight).map(p => p.text.toLowerCase()).join(", ") || "надёжный телефон"}.
                      За {selectedPhone.price.toLocaleString()} рублей вы получаете флагманские возможности."
                    </p>
                  </div>
                </div>

                {/* Accessories upsell */}
                {accessoryRecommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-cyan-500" />
                      Предложите аксессуары
                    </h3>
                    <div className="space-y-3">
                      {accessoryRecommendations.map((rec, i) => {
                        const isSelected = selectedAccessories.some(a => a.id === rec.product.id);
                        return (
                          <motion.div
                            key={rec.product.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => handleSelectAccessory(rec.product)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? "bg-cyan-500/10 border-cyan-500" : "bg-white/5 border-gray-800 hover:border-cyan-500"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected ? "border-cyan-500 bg-cyan-500" : "border-gray-600"
                              }`}>
                                {isSelected && <Check className="w-4 h-4 text-black" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium">{rec.product.name}</h4>
                                  <span className="text-cyan-400 font-bold">{rec.product.price.toLocaleString()} ₽</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">{rec.reason}</p>
                                <p className="text-sm text-cyan-400 mt-1">"{rec.benefit}"</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tariff Pitch */}
            {selectedTariff && startWith === "tariff" && (
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl p-6 border border-blue-500/30">
                <div className="mb-6">
                  <h2 className="text-xl font-bold">{selectedTariff.name}</h2>
                  <p className="text-3xl font-bold text-blue-400 mt-1">
                    {selectedTariff.price} ₽/мес
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Преимущества тарифа
                  </h3>
                  <div className="space-y-2">
                    {getTariffSellingPoints(selectedTariff).map((point, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          point.highlight ? "bg-blue-500/20 border border-blue-500/30" : "bg-white/5"
                        }`}
                      >
                        <span className={point.highlight ? "text-blue-400" : "text-gray-400"}>
                          {point.icon}
                        </span>
                        <span className={point.highlight ? "font-medium" : ""}>{point.text}</span>
                        {point.highlight && (
                          <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded">TOP</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick speech */}
                <div className="p-4 rounded-xl bg-black/30 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Скажите клиенту:</p>
                  <p className="italic">
                    "Тариф {selectedTariff.name} идеально подходит для{" "}
                    {selectedTariff.unlimited_internet ? "активного использования интернета" :
                     selectedTariff.unlimited_calls ? "частых звонков" : "экономных пользователей"}.
                    Всего {selectedTariff.price} рублей в месяц!"
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <motion.button
                onClick={handleGoToUpsell}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold flex items-center justify-center gap-2"
              >
                Продолжить
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step: Upsell - Offer tariff after phone */}
        {step === "upsell" && (
          <motion.div
            key="upsell"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Предложите тариф</h2>
              <p className="text-gray-500">Клиент хочет перейти на Tele2</p>
            </div>

            <div className="grid gap-4">
              {tariffs.map((tariff, index) => {
                const isSelected = selectedTariff?.id === tariff.id;
                return (
                  <motion.div
                    key={tariff.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedTariff(isSelected ? null : tariff)}
                    className={`bg-white/5 rounded-2xl p-4 border cursor-pointer transition-all ${
                      isSelected ? "border-blue-500 bg-blue-500/10" : "border-gray-800 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{tariff.name}</h3>
                        <p className="text-xl font-bold text-blue-400">{tariff.price} ₽/мес</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {tariff.unlimited_internet ? "Безлимит" : `${tariff.gb} ГБ`} •{" "}
                          {tariff.unlimited_calls ? "Безлимит" : `${tariff.minutes} мин`}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-blue-500 bg-blue-500" : "border-gray-600"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("services")}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                Пропустить
              </button>
              <motion.button
                onClick={() => setStep("services")}
                disabled={!selectedTariff}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold disabled:opacity-50"
              >
                Добавить тариф
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step: Services */}
        {step === "services" && (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Дополнительные услуги</h2>
              <p className="text-gray-500">Предложите защиту и сервис</p>
            </div>

            <div className="space-y-4">
              {services.map((service, index) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAddService(service)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "bg-green-500/10 border-green-500" : "bg-white/5 border-gray-800 hover:border-green-500"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-500">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{service.price} ₽</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-green-500 bg-green-500" : "border-gray-600"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.button
              onClick={() => setStep("summary")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold"
            >
              К оформлению
            </motion.button>
          </motion.div>
        )}

        {/* Step: Summary */}
        {step === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Итог продажи</h2>
              <p className="text-gray-500">Проверьте и подтвердите</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-gray-800 space-y-4">
              {selectedPhone && (
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-medium">{selectedPhone.name}</p>
                      <p className="text-sm text-gray-500">Телефон</p>
                    </div>
                  </div>
                  <p className="font-bold">{selectedPhone.price.toLocaleString()} ₽</p>
                </div>
              )}

              {selectedTariff && (
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{selectedTariff.name}</p>
                      <p className="text-sm text-gray-500">Тариф</p>
                    </div>
                  </div>
                  <p className="font-bold">{selectedTariff.price} ₽/мес</p>
                </div>
              )}

              {selectedAccessories.map(acc => (
                <div key={acc.id} className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Headphones className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-sm text-gray-500">Аксессуар</p>
                    </div>
                  </div>
                  <p className="font-bold">{acc.price.toLocaleString()} ₽</p>
                </div>
              ))}

              {selectedServices.map(svc => (
                <div key={svc.id} className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      <p className="text-sm text-gray-500">Услуга</p>
                    </div>
                  </div>
                  <p className="font-bold">{svc.price} ₽</p>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-lg font-semibold">Итого:</p>
                  {selectedTariff && (
                    <p className="text-sm text-gray-500">+ {selectedTariff.price} ₽/мес за тариф</p>
                  )}
                </div>
                <p className="text-3xl font-bold text-cyan-400">
                  {calculateTotal().toLocaleString()} ₽
                </p>
              </div>
            </div>

            {/* Success message */}
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <ThumbsUp className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-400">Отличная продажа!</p>
                  <p className="text-sm text-gray-400">
                    {[selectedPhone, selectedTariff, ...selectedAccessories, ...selectedServices].filter(Boolean).length} позиций
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetSale}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                Отменить
              </button>
              <motion.button
                onClick={completeSale}
                disabled={isLoading || (!selectedPhone && !selectedTariff && selectedAccessories.length === 0)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Завершить
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

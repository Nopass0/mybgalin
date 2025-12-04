"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Package,
  ShoppingCart,
  ChevronRight,
  Check,
  X,
  Loader2,
  CreditCard,
  Phone,
  Shield,
  Headphones,
  RefreshCw,
  DollarSign,
  Star,
  TrendingUp,
  MessageCircle,
  History,
} from "lucide-react";
import {
  T2Product,
  T2Tariff,
  T2Service,
  T2Sale,
  ProductRecommendation,
  AccessoryRecommendation,
  t2ApiService,
} from "@/lib/t2-api";

type SaleStep = "request" | "phones" | "accessories" | "services" | "tariffs" | "summary";

export default function SalePage() {
  const [step, setStep] = useState<SaleStep>("request");
  const [customerRequest, setCustomerRequest] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Recommendations
  const [phoneRecommendations, setPhoneRecommendations] = useState<ProductRecommendation[]>([]);
  const [accessoryRecommendations, setAccessoryRecommendations] = useState<AccessoryRecommendation[]>([]);
  const [tariffRecommendations, setTariffRecommendations] = useState<{ tariff: T2Tariff; recommendation: string }[]>([]);
  const [services, setServices] = useState<T2Service[]>([]);

  // Selected items
  const [selectedPhone, setSelectedPhone] = useState<T2Product | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<T2Product[]>([]);
  const [selectedServices, setSelectedServices] = useState<T2Service[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<T2Tariff | null>(null);
  const [isSmartphone, setIsSmartphone] = useState(false);

  // Sales history
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState<T2Sale[]>([]);

  useEffect(() => {
    loadServices();
    loadSalesHistory();
  }, []);

  const loadServices = async () => {
    try {
      const svcs = await t2ApiService.getServices();
      setServices(svcs);
    } catch (e) {
      console.error("Failed to load services:", e);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const history = await t2ApiService.getMySales();
      setSalesHistory(history);
    } catch (e) {
      console.error("Failed to load sales history:", e);
    }
  };

  const handleAnalyzeRequest = async () => {
    if (!customerRequest.trim()) return;

    setIsLoading(true);
    try {
      const result = await t2ApiService.recommendProducts(customerRequest);
      setPhoneRecommendations(result.recommendations);
      setStep("phones");
    } catch (e) {
      console.error("Failed to analyze:", e);
      alert("Ошибка анализа запроса");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhone = async (recommendation: ProductRecommendation) => {
    setSelectedPhone(recommendation.product);
    setIsLoading(true);

    try {
      // Check if smartphone
      const smartphone = await t2ApiService.isSmartphone(recommendation.product.id);
      setIsSmartphone(smartphone);

      // Get accessory recommendations
      const accessories = await t2ApiService.recommendAccessories(recommendation.product.id);
      setAccessoryRecommendations(accessories);

      // Get tariff recommendations
      const tariffs = await t2ApiService.recommendTariffs(
        customerRequest,
        recommendation.product.id
      );
      setTariffRecommendations(tariffs);

      setStep("accessories");
    } catch (e) {
      console.error("Failed to get recommendations:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclinePhone = () => {
    completeSale("declined");
  };

  const handleAddAccessory = (product: T2Product) => {
    if (selectedAccessories.find((a) => a.id === product.id)) {
      setSelectedAccessories(selectedAccessories.filter((a) => a.id !== product.id));
    } else {
      setSelectedAccessories([...selectedAccessories, product]);
    }
  };

  const handleNextFromAccessories = () => {
    if (isSmartphone) {
      setStep("services");
    } else {
      setStep("tariffs");
    }
  };

  const handleAddService = (service: T2Service) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleSelectTariff = (tariff: T2Tariff) => {
    setSelectedTariff(tariff);
    setStep("summary");
  };

  const handleSkipTariff = () => {
    setStep("summary");
  };

  const completeSale = async (status: "completed" | "declined") => {
    if (status === "declined") {
      resetSale();
      return;
    }

    setIsLoading(true);
    try {
      const items: { item_type: string; item_id: number; quantity?: number }[] = [];

      if (selectedPhone) {
        items.push({ item_type: "product", item_id: selectedPhone.id });
      }

      for (const accessory of selectedAccessories) {
        items.push({ item_type: "product", item_id: accessory.id });
      }

      for (const service of selectedServices) {
        items.push({ item_type: "service", item_id: service.id });
      }

      if (selectedTariff) {
        items.push({ item_type: "tariff", item_id: selectedTariff.id });
      }

      await t2ApiService.createSale({
        customer_request: customerRequest,
        items,
      });

      loadSalesHistory();
      resetSale();
      alert("Продажа успешно завершена!");
    } catch (e) {
      console.error("Failed to create sale:", e);
      alert("Ошибка создания продажи");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSale = () => {
    setStep("request");
    setCustomerRequest("");
    setPhoneRecommendations([]);
    setAccessoryRecommendations([]);
    setTariffRecommendations([]);
    setSelectedPhone(null);
    setSelectedAccessories([]);
    setSelectedServices([]);
    setSelectedTariff(null);
    setIsSmartphone(false);
  };

  const calculateTotal = () => {
    let total = 0;
    if (selectedPhone) total += selectedPhone.price;
    for (const a of selectedAccessories) total += a.price;
    for (const s of selectedServices) total += s.price;
    if (selectedTariff) total += selectedTariff.price;
    return total;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Продажа</h1>
          <p className="text-gray-500">AI-помощник подберёт лучший вариант</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <History className="w-5 h-5" />
          История
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { key: "request", label: "Запрос", icon: MessageCircle },
          { key: "phones", label: "Телефон", icon: Phone },
          { key: "accessories", label: "Аксессуары", icon: Headphones },
          { key: "services", label: "Услуги", icon: Shield },
          { key: "tariffs", label: "Тариф", icon: CreditCard },
          { key: "summary", label: "Итог", icon: Check },
        ].map((s, index) => {
          const stepOrder = ["request", "phones", "accessories", "services", "tariffs", "summary"];
          const currentIndex = stepOrder.indexOf(step);
          const itemIndex = stepOrder.indexOf(s.key);
          const isActive = s.key === step;
          const isPast = itemIndex < currentIndex;

          return (
            <div key={s.key} className="flex items-center">
              <motion.div
                animate={{
                  backgroundColor: isActive
                    ? "rgb(0, 188, 212)"
                    : isPast
                    ? "rgba(0, 188, 212, 0.3)"
                    : "rgba(255, 255, 255, 0.05)",
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap ${
                  isActive ? "text-black" : isPast ? "text-cyan-400" : "text-gray-500"
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </motion.div>
              {index < 5 && (
                <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Customer Request */}
        {step === "request" && (
          <motion.div
            key="request"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/5 rounded-3xl p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Что ищет клиент?</h2>
                  <p className="text-sm text-gray-500">
                    Опишите потребности клиента
                  </p>
                </div>
              </div>

              <textarea
                value={customerRequest}
                onChange={(e) => setCustomerRequest(e.target.value)}
                placeholder="Например: Нужен телефон с хорошей камерой для мамы, бюджет до 20 тысяч, чтобы был простой в использовании"
                rows={4}
                className="w-full p-4 rounded-xl bg-black/30 border border-gray-700 focus:border-cyan-500 outline-none resize-none transition-colors"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-3 rounded-xl transition-colors ${
                    isRecording
                      ? "bg-red-500 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <motion.button
                  onClick={handleAnalyzeRequest}
                  disabled={!customerRequest.trim() || isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Подобрать варианты
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Phone Recommendations */}
        {step === "phones" && (
          <motion.div
            key="phones"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Рекомендуемые телефоны</h2>
              <p className="text-gray-500">AI подобрал 3 варианта под запрос клиента</p>
            </div>

            {phoneRecommendations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Подходящие товары не найдены</p>
                <button
                  onClick={resetSale}
                  className="mt-4 text-cyan-500 hover:text-cyan-400"
                >
                  Начать заново
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {phoneRecommendations.map((rec, index) => (
                  <motion.div
                    key={rec.product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white/5 rounded-2xl p-6 border cursor-pointer transition-all hover:shadow-xl hover:shadow-cyan-500/10 ${
                      rec.price_category === "expensive"
                        ? "border-yellow-500/30 hover:border-yellow-500"
                        : rec.price_category === "cheap"
                        ? "border-green-500/30 hover:border-green-500"
                        : "border-cyan-500/30 hover:border-cyan-500"
                    }`}
                    onClick={() => handleSelectPhone(rec)}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-24 h-24 rounded-xl bg-black/30 flex-shrink-0 overflow-hidden">
                        {rec.product.image_url ? (
                          <img
                            src={rec.product.image_url}
                            alt={rec.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Phone className="w-10 h-10 text-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-lg ${
                                rec.price_category === "expensive"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : rec.price_category === "cheap"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-cyan-500/20 text-cyan-400"
                              }`}
                            >
                              {rec.price_category === "expensive"
                                ? "Премиум"
                                : rec.price_category === "cheap"
                                ? "Бюджетный"
                                : "Оптимальный"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{rec.match_score}%</span>
                          </div>
                        </div>

                        <h3 className="font-semibold truncate">{rec.product.name}</h3>
                        <p className="text-2xl font-bold text-cyan-400 mt-1">
                          {rec.product.price.toLocaleString()} ₽
                        </p>

                        {/* Match reasons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {rec.match_reasons.slice(0, 3).map((reason, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className="w-6 h-6 text-gray-600 flex-shrink-0 self-center" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <button
              onClick={handleDeclinePhone}
              className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Клиент отказался
            </button>
          </motion.div>
        )}

        {/* Step 3: Accessories */}
        {step === "accessories" && (
          <motion.div
            key="accessories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Аксессуары</h2>
              <p className="text-gray-500">
                AI рекомендует эти аксессуары к {selectedPhone?.name}
              </p>
            </div>

            {accessoryRecommendations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Подходящие аксессуары не найдены</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accessoryRecommendations.map((rec, index) => {
                  const isSelected = selectedAccessories.some(
                    (a) => a.id === rec.product.id
                  );
                  return (
                    <motion.div
                      key={rec.product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleAddAccessory(rec.product)}
                      className={`bg-white/5 rounded-2xl p-4 border cursor-pointer transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl bg-black/30 flex-shrink-0 flex items-center justify-center">
                          <Headphones className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{rec.product.name}</h3>
                              <p className="text-lg font-bold text-cyan-400">
                                {rec.product.price.toLocaleString()} ₽
                              </p>
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-cyan-500 bg-cyan-500"
                                  : "border-gray-600"
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-black" />}
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 mt-2">{rec.reason}</p>
                          <p className="text-sm text-cyan-400 mt-1">{rec.benefit}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleNextFromAccessories}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                {selectedAccessories.length > 0 ? "Далее" : "Пропустить"}
              </button>
              <button
                onClick={handleNextFromAccessories}
                disabled={selectedAccessories.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold disabled:opacity-50"
              >
                Добавить ({selectedAccessories.length})
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Services (for smartphones only) */}
        {step === "services" && (
          <motion.div
            key="services"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Услуги</h2>
              <p className="text-gray-500">Предложите защиту для нового смартфона</p>
            </div>

            <div className="space-y-4">
              {services
                .filter((s) => !s.for_smartphones_only || isSmartphone)
                .map((service, index) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleAddService(service)}
                      className={`bg-white/5 rounded-2xl p-4 border cursor-pointer transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-cyan-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-500">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-cyan-400">
                            {service.price.toLocaleString()} ₽
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-cyan-500 bg-cyan-500"
                              : "border-gray-600"
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-black" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("tariffs")}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                {selectedServices.length > 0 ? "Далее" : "Пропустить"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Tariffs */}
        {step === "tariffs" && (
          <motion.div
            key="tariffs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Тарифы Tele2</h2>
              <p className="text-gray-500">AI рекомендует эти тарифы</p>
            </div>

            {tariffRecommendations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Тарифы не настроены</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tariffRecommendations.map((rec, index) => (
                  <motion.div
                    key={rec.tariff.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectTariff(rec.tariff)}
                    className="bg-white/5 rounded-2xl p-6 border border-gray-800 hover:border-cyan-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{rec.tariff.name}</h3>
                        <p className="text-2xl font-bold text-cyan-400 mt-1">
                          {rec.tariff.price.toLocaleString()} ₽/мес
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-600" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 rounded-xl bg-black/30">
                        <p className="text-2xl font-bold">
                          {rec.tariff.unlimited_calls ? "∞" : rec.tariff.minutes || 0}
                        </p>
                        <p className="text-xs text-gray-500">минут</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/30">
                        <p className="text-2xl font-bold">
                          {rec.tariff.unlimited_internet ? "∞" : rec.tariff.gb || 0}
                        </p>
                        <p className="text-xs text-gray-500">ГБ</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/30">
                        <p className="text-2xl font-bold">
                          {rec.tariff.unlimited_sms ? "∞" : rec.tariff.sms || 0}
                        </p>
                        <p className="text-xs text-gray-500">SMS</p>
                      </div>
                    </div>

                    <p className="text-sm text-cyan-400">{rec.recommendation}</p>

                    {rec.tariff.unlimited_apps && (
                      <p className="text-xs text-gray-500 mt-2">
                        Безлимит: {rec.tariff.unlimited_apps}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            <button
              onClick={handleSkipTariff}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              Клиент отказался от тарифа
            </button>
          </motion.div>
        )}

        {/* Step 6: Summary */}
        {step === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Итог продажи</h2>
              <p className="text-gray-500">Проверьте и подтвердите</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-gray-800 space-y-4">
              {/* Phone */}
              {selectedPhone && (
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-medium">{selectedPhone.name}</p>
                      <p className="text-sm text-gray-500">Телефон</p>
                    </div>
                  </div>
                  <p className="font-bold">{selectedPhone.price.toLocaleString()} ₽</p>
                </div>
              )}

              {/* Accessories */}
              {selectedAccessories.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between py-3 border-b border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Headphones className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-sm text-gray-500">Аксессуар</p>
                    </div>
                  </div>
                  <p className="font-bold">{acc.price.toLocaleString()} ₽</p>
                </div>
              ))}

              {/* Services */}
              {selectedServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between py-3 border-b border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      <p className="text-sm text-gray-500">Услуга</p>
                    </div>
                  </div>
                  <p className="font-bold">{svc.price.toLocaleString()} ₽</p>
                </div>
              ))}

              {/* Tariff */}
              {selectedTariff && (
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-medium">{selectedTariff.name}</p>
                      <p className="text-sm text-gray-500">Тариф</p>
                    </div>
                  </div>
                  <p className="font-bold">{selectedTariff.price.toLocaleString()} ₽/мес</p>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-lg font-semibold">Итого:</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {calculateTotal().toLocaleString()} ₽
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetSale}
                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Отменить
              </button>
              <motion.button
                onClick={() => completeSale("completed")}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Завершить продажу
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sales History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-[#111] rounded-3xl border border-cyan-500/20"
            >
              <div className="sticky top-0 bg-[#111] p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">История продаж</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-xl hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {salesHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>История продаж пуста</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesHistory.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-white/5 rounded-xl p-4 border border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-500">
                            {new Date(sale.created_at).toLocaleString("ru")}
                          </span>
                          <span className="text-lg font-bold text-cyan-400">
                            {sale.total_amount.toLocaleString()} ₽
                          </span>
                        </div>
                        <div className="space-y-2">
                          {sale.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-400">{item.item_name}</span>
                              <span>{item.price.toLocaleString()} ₽</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Camera,
  Upload,
  X,
  Package,
  Smartphone,
  Headphones,
  CreditCard,
  Wrench,
  Tag,
  Edit,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  ScanLine,
  Sparkles,
  ImageIcon,
  Wifi,
  Settings,
  Phone,
} from "lucide-react";
import {
  T2Product,
  T2Category,
  T2Tag,
  T2Tariff,
  T2Service,
  t2ApiService,
  AnalyzedPriceTag,
} from "@/lib/t2-api";

type TabType = "products" | "tags" | "tariffs" | "services";

const categoryIcons: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="w-5 h-5" />,
  headphones: <Headphones className="w-5 h-5" />,
  "sim-card": <CreditCard className="w-5 h-5" />,
  wrench: <Wrench className="w-5 h-5" />,
};

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [products, setProducts] = useState<T2Product[]>([]);
  const [categories, setCategories] = useState<T2Category[]>([]);
  const [tags, setTags] = useState<T2Tag[]>([]);
  const [tariffs, setTariffs] = useState<T2Tariff[]>([]);
  const [services, setServices] = useState<T2Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<T2Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<T2Product | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<T2Tag | null>(null);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<T2Tariff | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<T2Service | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "products") {
        loadProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, activeTab]);

  const loadData = async () => {
    try {
      const [cats, tgs, trfs, srvs] = await Promise.all([
        t2ApiService.getCategories(),
        t2ApiService.getTags(),
        t2ApiService.getTariffs(),
        t2ApiService.getServices(),
      ]);
      setCategories(cats);
      setTags(tgs);
      setTariffs(trfs);
      setServices(srvs);
      await loadProducts();
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const prods = await t2ApiService.getProducts(
        selectedCategory || undefined,
        searchQuery || undefined
      );
      setProducts(prods);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  };

  const loadTags = async () => {
    try {
      const tgs = await t2ApiService.getTags();
      setTags(tgs);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  };

  const loadTariffs = async () => {
    try {
      const trfs = await t2ApiService.getTariffs();
      setTariffs(trfs);
    } catch (e) {
      console.error("Failed to load tariffs:", e);
    }
  };

  const loadServices = async () => {
    try {
      const srvs = await t2ApiService.getServices();
      setServices(srvs);
    } catch (e) {
      console.error("Failed to load services:", e);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Удалить товар?")) return;
    try {
      await t2ApiService.deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
    } catch (e) {
      console.error("Failed to delete product:", e);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("Удалить ярлык?")) return;
    try {
      await t2ApiService.deleteTag(tagId);
      setTags(tags.filter((t) => t.id !== tagId));
    } catch (e) {
      console.error("Failed to delete tag:", e);
    }
  };

  const handleDeleteTariff = async (tariffId: number) => {
    if (!confirm("Удалить тариф?")) return;
    try {
      await t2ApiService.deleteTariff(tariffId);
      setTariffs(tariffs.filter((t) => t.id !== tariffId));
    } catch (e) {
      console.error("Failed to delete tariff:", e);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Удалить услугу?")) return;
    try {
      await t2ApiService.deleteService(serviceId);
      setServices(services.filter((s) => s.id !== serviceId));
    } catch (e) {
      console.error("Failed to delete service:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const tabs = [
    { id: "products" as TabType, label: "Товары", icon: <Package className="w-4 h-4" />, count: products.length },
    { id: "tags" as TabType, label: "Ярлыки", icon: <Tag className="w-4 h-4" />, count: tags.length },
    { id: "tariffs" as TabType, label: "Тарифы", icon: <Wifi className="w-4 h-4" />, count: tariffs.length },
    { id: "services" as TabType, label: "Услуги", icon: <Settings className="w-4 h-4" />, count: services.length },
  ];

  const getAddButtonConfig = () => {
    switch (activeTab) {
      case "products": return { label: "Добавить товар", onClick: () => setIsAddModalOpen(true) };
      case "tags": return { label: "Добавить ярлык", onClick: () => setIsTagModalOpen(true) };
      case "tariffs": return { label: "Добавить тариф", onClick: () => setIsTariffModalOpen(true) };
      case "services": return { label: "Добавить услугу", onClick: () => setIsServiceModalOpen(true) };
    }
  };

  const addBtn = getAddButtonConfig();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Управление каталогом</h1>
          <p className="text-gray-500">
            Товары, ярлыки, тарифы и услуги
          </p>
        </div>
        <motion.button
          onClick={addBtn.onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-5 h-5" />
          {addBtn.label}
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-cyan-500 text-black font-medium"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-xs ${
              activeTab === tab.id ? "bg-black/20" : "bg-white/10"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Products Tab Content */}
      {activeTab === "products" && (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Поиск по названию, бренду, характеристикам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  !selectedCategory
                    ? "bg-cyan-500 text-black font-medium"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Все
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    selectedCategory === cat.id
                      ? "bg-cyan-500 text-black font-medium"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {categoryIcons[cat.icon || ""] || <Package className="w-4 h-4" />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            Товары не найдены
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "Попробуйте изменить запрос"
              : "Добавьте первый товар в каталог"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedProduct(product)}
                className="group bg-white/5 rounded-2xl border border-gray-800 hover:border-cyan-500/50 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-cyan-500/10"
              >
                {/* Image */}
                <div className="aspect-square bg-black/30 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-700" />
                    </div>
                  )}

                  {/* Tags */}
                  {product.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {product.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-lg font-medium"
                          style={{ backgroundColor: tag.color + "30", color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-black/50 backdrop-blur-sm hover:bg-cyan-500 text-white hover:text-black transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="p-2 rounded-xl bg-black/50 backdrop-blur-sm hover:bg-red-500 text-white transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="text-xs text-cyan-500 mb-1">
                    {product.brand} {product.model && `• ${product.model}`}
                  </div>
                  <h3 className="font-semibold truncate mb-2">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-cyan-400">
                      {product.price.toLocaleString()} ₽
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.quantity} шт
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

        </>
      )}

      {/* Tags Tab Content */}
      {activeTab === "tags" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Tag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Ярлыков пока нет</h3>
              <p className="text-gray-600">Добавьте первый ярлык для товаров</p>
            </div>
          ) : (
            tags.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-2xl border border-gray-800 p-4 group hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: tag.color + "30" }}
                    >
                      <Tag className="w-5 h-5" style={{ color: tag.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tag.name}</h3>
                      {tag.description && (
                        <p className="text-sm text-gray-500">{tag.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTag(tag);
                        setIsTagModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Приоритет: {tag.priority}</span>
                  <span
                    className="px-2 py-1 text-xs rounded-lg"
                    style={{ backgroundColor: tag.color, color: "#000" }}
                  >
                    {tag.color}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Tariffs Tab Content */}
      {activeTab === "tariffs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tariffs.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Wifi className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Тарифов пока нет</h3>
              <p className="text-gray-600">Добавьте тарифы Tele2</p>
            </div>
          ) : (
            tariffs.map((tariff) => (
              <motion.div
                key={tariff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-2xl border border-gray-800 p-4 group hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{tariff.name}</h3>
                    <p className="text-2xl font-bold text-cyan-400">{tariff.price} ₽/мес</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTariff(tariff);
                        setIsTariffModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTariff(tariff.id)}
                      className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {tariff.minutes && <div className="flex justify-between"><span className="text-gray-500">Минуты:</span><span>{tariff.minutes}</span></div>}
                  {tariff.sms && <div className="flex justify-between"><span className="text-gray-500">SMS:</span><span>{tariff.sms}</span></div>}
                  {tariff.gb && <div className="flex justify-between"><span className="text-gray-500">Интернет:</span><span>{tariff.gb} ГБ</span></div>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tariff.unlimited_internet && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs">Безлимит интернет</span>}
                    {tariff.unlimited_calls && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs">Безлимит звонки</span>}
                    {tariff.unlimited_sms && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs">Безлимит SMS</span>}
                    {tariff.unlimited_t2 && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs">Безлимит на Tele2</span>}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Services Tab Content */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Settings className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Услуг пока нет</h3>
              <p className="text-gray-600">Добавьте услуги (например, наклейка защитного стекла)</p>
            </div>
          ) : (
            services.map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-2xl border border-gray-800 p-4 group hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      {service.for_smartphones_only && (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> Смартфоны
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-cyan-400 mb-2">{service.price} ₽</p>
                    {service.description && (
                      <p className="text-sm text-gray-500">{service.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setIsServiceModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        categories={categories}
        tags={tags}
        editingProduct={editingProduct}
        onSuccess={() => {
          loadProducts();
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEdit={() => {
          setEditingProduct(selectedProduct);
          setSelectedProduct(null);
          setIsAddModalOpen(true);
        }}
        onDelete={() => {
          if (selectedProduct) {
            handleDeleteProduct(selectedProduct.id);
            setSelectedProduct(null);
          }
        }}
      />

      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => {
          setIsTagModalOpen(false);
          setEditingTag(null);
        }}
        editingTag={editingTag}
        onSuccess={() => {
          loadTags();
          setIsTagModalOpen(false);
          setEditingTag(null);
        }}
      />

      <TariffModal
        isOpen={isTariffModalOpen}
        onClose={() => {
          setIsTariffModalOpen(false);
          setEditingTariff(null);
        }}
        editingTariff={editingTariff}
        onSuccess={() => {
          loadTariffs();
          setIsTariffModalOpen(false);
          setEditingTariff(null);
        }}
      />

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        editingService={editingService}
        onSuccess={() => {
          loadServices();
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
      />
    </div>
  );
}

// Add/Edit Product Modal
function AddProductModal({
  isOpen,
  onClose,
  categories,
  tags,
  editingProduct,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: T2Category[];
  tags: T2Tag[];
  editingProduct: T2Product | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState<number>(1);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [specs, setSpecs] = useState<{ name: string; value: string }[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setBrand(editingProduct.brand || "");
      setModel(editingProduct.model || "");
      setPrice(editingProduct.price.toString());
      setQuantity(editingProduct.quantity.toString());
      setCategoryId(editingProduct.category_id);
      setSelectedTags(editingProduct.tags.map((t) => t.id));
      setSpecs(
        editingProduct.specs.map((s) => ({ name: s.spec_name, value: s.spec_value }))
      );
      setImageUrl(editingProduct.image_url || "");
    } else {
      resetForm();
    }
  }, [editingProduct, isOpen]);

  const resetForm = () => {
    setName("");
    setBrand("");
    setModel("");
    setPrice("");
    setQuantity("1");
    setCategoryId(1);
    setSelectedTags([]);
    setSpecs([]);
    setImageUrl("");
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera error:", e);
      alert("Не удалось запустить камеру");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    analyzeImage(base64);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await t2ApiService.analyzePriceTag(base64);
      applyAnalyzedData(result);
    } catch (e) {
      console.error("Analysis failed:", e);
      alert("Не удалось распознать ценник");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalyzedData = (data: AnalyzedPriceTag) => {
    if (data.name) setName(data.name);
    if (data.brand) setBrand(data.brand);
    if (data.model) setModel(data.model);
    if (data.price) setPrice(data.price.toString());
    if (data.specs.length > 0) {
      setSpecs(data.specs);
    }
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      alert("Заполните название и цену");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        category_id: categoryId,
        name,
        brand: brand || undefined,
        model: model || undefined,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 1,
        image_url: imageUrl || undefined,
        specs,
        tag_ids: selectedTags,
      };

      if (editingProduct) {
        await t2ApiService.updateProduct(editingProduct.id, data);
      } else {
        await t2ApiService.createProduct(data);
      }
      onSuccess();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Ошибка сохранения");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111] rounded-3xl border border-cyan-500/20 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#111] p-6 border-b border-gray-800 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">
            {editingProduct ? "Редактировать товар" : "Новый товар"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        {showCamera && (
          <div className="p-6 border-b border-gray-800">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-cyan-500/50 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 border-2 border-cyan-500 rounded-lg">
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-cyan-500 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-semibold flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Сфотографировать
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* AI Scanner Buttons */}
        {!showCamera && (
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span className="font-semibold">AI-распознавание ценника</span>
            </div>
            <div className="flex gap-3">
              <motion.button
                onClick={startCamera}
                disabled={isAnalyzing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 hover:border-cyan-500 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5 text-cyan-500" />
                Камера
              </motion.button>
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 hover:border-cyan-500 transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-cyan-500" />
                )}
                {isAnalyzing ? "Анализ..." : "Загрузить фото"}
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Категория</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    categoryId === cat.id
                      ? "bg-cyan-500 text-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {categoryIcons[cat.icon || ""] || <Package className="w-4 h-4" />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Название *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Samsung Galaxy S24 Ultra"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Бренд</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Samsung"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Модель</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="S24 Ultra"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Цена *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="89990"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Количество</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ссылка на изображение</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none transition-colors"
              />
              {imageUrl && (
                <div className="w-12 h-12 rounded-xl bg-black/30 overflow-hidden">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Ярлыки</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTags(
                        selectedTags.includes(tag.id)
                          ? selectedTags.filter((id) => id !== tag.id)
                          : [...selectedTags, tag.id]
                      )
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedTags.includes(tag.id)
                        ? "ring-2 ring-offset-2 ring-offset-[#111]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: tag.color + "30",
                      color: tag.color,
                      ["--tw-ring-color" as string]: selectedTags.includes(tag.id) ? tag.color : "transparent",
                    } as React.CSSProperties}
                  >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Характеристики</label>
              <button
                type="button"
                onClick={() => setSpecs([...specs, { name: "", value: "" }])}
                className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                + Добавить
              </button>
            </div>
            <div className="space-y-2">
              {specs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={spec.name}
                    onChange={(e) => {
                      const newSpecs = [...specs];
                      newSpecs[index].name = e.target.value;
                      setSpecs(newSpecs);
                    }}
                    placeholder="Название"
                    className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => {
                      const newSpecs = [...specs];
                      newSpecs[index].value = e.target.value;
                      setSpecs(newSpecs);
                    }}
                    placeholder="Значение"
                    className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#111] p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            Отмена
          </button>
          <motion.button
            onClick={handleSubmit}
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
                {editingProduct ? "Сохранить" : "Добавить"}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Product Detail Modal
function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onDelete,
}: {
  product: T2Product | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!product) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#111] rounded-3xl border border-cyan-500/20 overflow-hidden"
      >
        {/* Image */}
        <div className="aspect-video bg-black/30 relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-700" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {product.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-sm rounded-lg font-medium"
                  style={{ backgroundColor: tag.color + "30", color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="text-sm text-cyan-500 mb-1">
            {product.brand} {product.model && `• ${product.model}`}
          </div>
          <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
          <div className="text-3xl font-bold text-cyan-400 mb-6">
            {product.price.toLocaleString()} ₽
          </div>

          {/* Specs */}
          {product.specs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-gray-400 mb-3">Характеристики</h3>
              <div className="space-y-2">
                {product.specs.map((spec) => (
                  <div key={spec.id} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-500">{spec.spec_name}</span>
                    <span className="font-medium">{spec.spec_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 py-3 rounded-xl bg-cyan-500/10 text-cyan-500 font-semibold hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Редактировать
            </button>
            <button
              onClick={onDelete}
              className="py-3 px-6 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Tag Modal
function TagModal({
  isOpen,
  onClose,
  editingTag,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingTag: T2Tag | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00bcd4");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingTag) {
      setName(editingTag.name);
      setColor(editingTag.color);
      setDescription(editingTag.description || "");
      setPriority(editingTag.priority.toString());
    } else {
      setName("");
      setColor("#00bcd4");
      setDescription("");
      setPriority("0");
    }
  }, [editingTag, isOpen]);

  const handleSubmit = async () => {
    if (!name) {
      alert("Введите название ярлыка");
      return;
    }
    setIsLoading(true);
    try {
      if (editingTag) {
        await t2ApiService.updateTag(editingTag.id, {
          name,
          color,
          description: description || undefined,
          priority: parseInt(priority) || 0,
        });
      } else {
        await t2ApiService.createTag(name, color, description || undefined, parseInt(priority) || 0);
      }
      onSuccess();
    } catch (e) {
      console.error("Failed to save tag:", e);
      alert("Ошибка сохранения");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111] rounded-3xl border border-cyan-500/20 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{editingTag ? "Редактировать ярлык" : "Новый ярлык"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Название *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Хит продаж"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Цвет</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded-xl bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Популярные товары"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Приоритет (0-100)</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min="0"
              max="100"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10">
            Отмена
          </button>
          <motion.button
            onClick={handleSubmit}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingTag ? "Сохранить" : "Создать"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Tariff Modal
function TariffModal({
  isOpen,
  onClose,
  editingTariff,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingTariff: T2Tariff | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("");
  const [sms, setSms] = useState("");
  const [gb, setGb] = useState("");
  const [unlimitedT2, setUnlimitedT2] = useState(false);
  const [unlimitedInternet, setUnlimitedInternet] = useState(false);
  const [unlimitedSms, setUnlimitedSms] = useState(false);
  const [unlimitedCalls, setUnlimitedCalls] = useState(false);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingTariff) {
      setName(editingTariff.name);
      setPrice(editingTariff.price.toString());
      setMinutes(editingTariff.minutes?.toString() || "");
      setSms(editingTariff.sms?.toString() || "");
      setGb(editingTariff.gb?.toString() || "");
      setUnlimitedT2(editingTariff.unlimited_t2);
      setUnlimitedInternet(editingTariff.unlimited_internet);
      setUnlimitedSms(editingTariff.unlimited_sms);
      setUnlimitedCalls(editingTariff.unlimited_calls);
      setDescription(editingTariff.description || "");
    } else {
      setName("");
      setPrice("");
      setMinutes("");
      setSms("");
      setGb("");
      setUnlimitedT2(false);
      setUnlimitedInternet(false);
      setUnlimitedSms(false);
      setUnlimitedCalls(false);
      setDescription("");
    }
  }, [editingTariff, isOpen]);

  const handleSubmit = async () => {
    if (!name || !price) {
      alert("Заполните название и цену");
      return;
    }
    setIsLoading(true);
    try {
      const data = {
        name,
        price: parseFloat(price),
        minutes: minutes ? parseInt(minutes) : undefined,
        sms: sms ? parseInt(sms) : undefined,
        gb: gb ? parseInt(gb) : undefined,
        unlimited_t2: unlimitedT2,
        unlimited_internet: unlimitedInternet,
        unlimited_sms: unlimitedSms,
        unlimited_calls: unlimitedCalls,
        description: description || undefined,
      };
      if (editingTariff) {
        await t2ApiService.updateTariff(editingTariff.id, data);
      } else {
        await t2ApiService.createTariff(data);
      }
      onSuccess();
    } catch (e) {
      console.error("Failed to save tariff:", e);
      alert("Ошибка сохранения");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111] rounded-3xl border border-cyan-500/20"
      >
        <div className="sticky top-0 bg-[#111] p-6 border-b border-gray-800 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">{editingTariff ? "Редактировать тариф" : "Новый тариф"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Название *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мой Онлайн+"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Цена (₽/мес) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Минуты</label>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="500"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">SMS</label>
              <input
                type="number"
                value={sms}
                onChange={(e) => setSms(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">ГБ</label>
              <input
                type="number"
                value={gb}
                onChange={(e) => setGb(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Безлимиты</label>
            <div className="space-y-2">
              {[
                { state: unlimitedInternet, setter: setUnlimitedInternet, label: "Безлимитный интернет" },
                { state: unlimitedCalls, setter: setUnlimitedCalls, label: "Безлимитные звонки" },
                { state: unlimitedSms, setter: setUnlimitedSms, label: "Безлимитные SMS" },
                { state: unlimitedT2, setter: setUnlimitedT2, label: "Безлимит на Tele2" },
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="w-5 h-5 rounded accent-cyan-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительная информация о тарифе..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none resize-none"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-[#111] p-6 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10">
            Отмена
          </button>
          <motion.button
            onClick={handleSubmit}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingTariff ? "Сохранить" : "Создать"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Service Modal
function ServiceModal({
  isOpen,
  onClose,
  editingService,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingService: T2Service | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [forSmartphonesOnly, setForSmartphonesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingService) {
      setName(editingService.name);
      setPrice(editingService.price.toString());
      setDescription(editingService.description || "");
      setForSmartphonesOnly(editingService.for_smartphones_only);
    } else {
      setName("");
      setPrice("");
      setDescription("");
      setForSmartphonesOnly(false);
    }
  }, [editingService, isOpen]);

  const handleSubmit = async () => {
    if (!name || !price) {
      alert("Заполните название и цену");
      return;
    }
    setIsLoading(true);
    try {
      const data = {
        name,
        price: parseFloat(price),
        description: description || undefined,
        for_smartphones_only: forSmartphonesOnly,
      };
      if (editingService) {
        await t2ApiService.updateService(editingService.id, data);
      } else {
        await t2ApiService.createService(data);
      }
      onSuccess();
    } catch (e) {
      console.error("Failed to save service:", e);
      alert("Ошибка сохранения");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111] rounded-3xl border border-cyan-500/20 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{editingService ? "Редактировать услугу" : "Новая услуга"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Название *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наклейка защитного стекла"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Цена (₽) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="200"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание услуги..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gray-700 focus:border-cyan-500 outline-none resize-none"
            />
          </div>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={forSmartphonesOnly}
              onChange={(e) => setForSmartphonesOnly(e.target.checked)}
              className="w-5 h-5 rounded accent-cyan-500"
            />
            <div>
              <span className="font-medium">Только для смартфонов</span>
              <p className="text-sm text-gray-500">Услуга будет предлагаться только при продаже смартфонов</p>
            </div>
          </label>
        </div>
        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10">
            Отмена
          </button>
          <motion.button
            onClick={handleSubmit}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingService ? "Сохранить" : "Создать"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * T2 Sales System Controller
 * 
 * Complete T2 API for sales management system including:
 * - Auth (login/logout/me)
 * - Admin (stores, employees management)
 * - Products, Tags, Categories
 * - Tariffs, Services
 * - Sales tracking
 * - Stats
 */

import { Elysia, t } from "elysia";
import { prisma } from "../db/client";
import { createHash, randomBytes } from "crypto";

// Helper functions
function generateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function generateToken(): string {
  const hash = createHash("sha256");
  hash.update(randomBytes(32).toString("hex"));
  hash.update(Date.now().toString());
  return hash.digest("hex");
}

// T2 Auth middleware
async function getT2Auth(token: string | undefined) {
  if (!token) return null;
  
  const cleanToken = token.replace("Bearer ", "");
  
  const session = await prisma.t2Session.findUnique({
    where: { token: cleanToken },
    include: { employee: { include: { store: true } } },
  });
  
  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }
  
  return session.employee;
}

// Get employee with stores
async function getEmployeeWithStores(employeeId: number) {
  const employee = await prisma.t2Employee.findUnique({
    where: { id: employeeId },
    include: { store: true },
  });
  
  if (!employee) return null;
  
  let stores = [employee.store];
  
  if (employee.is_admin) {
    const allStores = await prisma.t2Store.findMany({
      where: { id: { not: employee.store_id } },
    });
    stores = [...stores, ...allStores];
  } else {
    const additionalStores = await prisma.t2EmployeeStore.findMany({
      where: { employee_id: employeeId },
      include: { store: true },
    });
    stores = [...stores, ...additionalStores.map(es => es.store)];
  }
  
  return {
    id: employee.id,
    store_id: employee.store_id,
    name: employee.name,
    code: employee.code,
    is_admin: employee.is_admin,
    created_at: employee.created_at.toISOString(),
    stores: stores.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address,
      admin_code: s.admin_code,
      created_at: s.created_at.toISOString(),
      updated_at: s.updated_at.toISOString(),
    })),
  };
}

// Get product with details
async function getProductWithDetails(productId: number) {
  const product = await prisma.t2Product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      specs: true,
      tags: { include: { tag: true } },
    },
  });
  
  if (!product) return null;
  
  return {
    id: product.id,
    store_id: product.store_id,
    category_id: product.category_id,
    category_name: product.category.name,
    name: product.name,
    brand: product.brand,
    model: product.model,
    price: product.price,
    quantity: product.quantity,
    image_url: product.image_url,
    specs: product.specs.map(s => ({
      id: s.id,
      product_id: s.product_id,
      spec_name: s.spec_name,
      spec_value: s.spec_value,
    })),
    tags: product.tags.map(pt => ({
      id: pt.tag.id,
      store_id: pt.tag.store_id,
      name: pt.tag.name,
      color: pt.tag.color,
      description: pt.tag.description,
      priority: pt.tag.priority,
      created_at: pt.tag.created_at.toISOString(),
    })),
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
  };
}

export const t2Controller = new Elysia({ prefix: "/api/t2" })
  // ============ HEALTH CHECK ============
  .get("/health", () => ({
    success: true,
    data: "T2 API is running",
  }))
  
  // ============ AUTH ROUTES ============
  .post("/auth/login", async ({ body }) => {
    const { code, name } = body as { code: string; name?: string };
    
    const employee = await prisma.t2Employee.findUnique({
      where: { code },
    });
    
    if (!employee) {
      return { success: false, error: "Неверный код доступа" };
    }
    
    // Update name if provided and employee name is empty
    if (name && (employee.name === "" || employee.name === "Новый сотрудник")) {
      await prisma.t2Employee.update({
        where: { id: employee.id },
        data: { name },
      });
    }
    
    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await prisma.t2Session.create({
      data: {
        employee_id: employee.id,
        token,
        expires_at: expiresAt,
      },
    });
    
    const employeeWithStores = await getEmployeeWithStores(employee.id);
    
    return {
      success: true,
      data: {
        token,
        employee: employeeWithStores,
      },
    };
  })
  
  .post("/auth/logout", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    await prisma.t2Session.deleteMany({
      where: { employee_id: employee.id },
    });
    
    return { success: true, data: null };
  })
  
  .get("/auth/me", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const employeeWithStores = await getEmployeeWithStores(employee.id);
    return { success: true, data: employeeWithStores };
  })
  
  // ============ ADMIN ROUTES ============
  .get("/admin/info", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const adminEmployee = await prisma.t2Employee.findFirst({
      where: { is_admin: true },
    });
    
    const employeeWithStores = await getEmployeeWithStores(employee.id);
    
    return {
      success: true,
      data: {
        admin_code: adminEmployee?.code || "",
        employee: employeeWithStores,
      },
    };
  })
  
  .get("/admin/stores", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const stores = await prisma.t2Store.findMany({
      orderBy: { id: "asc" },
    });
    
    return {
      success: true,
      data: stores.map(s => ({
        ...s,
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
      })),
    };
  })
  
  .post("/admin/stores", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const { name, address } = body as { name: string; address: string };
    const adminCode = generateCode();
    
    const store = await prisma.t2Store.create({
      data: { name, address, admin_code: adminCode },
    });
    
    return {
      success: true,
      data: {
        ...store,
        created_at: store.created_at.toISOString(),
        updated_at: store.updated_at.toISOString(),
      },
    };
  })
  
  .delete("/admin/stores/:storeId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const storeId = parseInt(params.storeId);
    if (storeId === 1) {
      return { success: false, error: "Cannot delete main office" };
    }
    
    await prisma.t2Store.delete({ where: { id: storeId } });
    return { success: true, data: null };
  })
  
  .get("/admin/employees", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const employees = await prisma.t2Employee.findMany({
      orderBy: { id: "asc" },
    });
    
    return {
      success: true,
      data: employees.map(e => ({
        ...e,
        created_at: e.created_at.toISOString(),
      })),
    };
  })
  
  .post("/admin/employees", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const { store_id, name } = body as { store_id: number; name: string };
    const code = generateCode();
    
    const newEmployee = await prisma.t2Employee.create({
      data: { store_id, name, code, is_admin: false },
    });
    
    return {
      success: true,
      data: {
        ...newEmployee,
        created_at: newEmployee.created_at.toISOString(),
      },
    };
  })
  
  .delete("/admin/employees/:employeeId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee || !employee.is_admin) {
      return { success: false, error: "Admin access required" };
    }
    
    const employeeId = parseInt(params.employeeId);
    if (employeeId === 1) {
      return { success: false, error: "Cannot delete main admin" };
    }
    
    await prisma.t2Employee.delete({ where: { id: employeeId } });
    return { success: true, data: null };
  })
  
  // ============ CATEGORIES ============
  .get("/categories", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const categories = await prisma.t2Category.findMany({
      orderBy: { id: "asc" },
    });
    
    return {
      success: true,
      data: categories.map(c => ({
        ...c,
        created_at: c.created_at.toISOString(),
      })),
    };
  })
  
  // ============ TAGS ============
  .get("/tags", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    
    const tags = await prisma.t2Tag.findMany({
      where: { store_id: storeId },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });
    
    return {
      success: true,
      data: tags.map(t => ({
        ...t,
        created_at: t.created_at.toISOString(),
      })),
    };
  })
  
  .post("/tags", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { name, color, description, priority } = body as {
      name: string;
      color: string;
      description?: string;
      priority?: number;
    };
    
    const tag = await prisma.t2Tag.create({
      data: {
        store_id: employee.store_id,
        name,
        color,
        description,
        priority: priority || 0,
      },
    });
    
    return {
      success: true,
      data: { ...tag, created_at: tag.created_at.toISOString() },
    };
  })
  
  .put("/tags/:tagId", async ({ headers, params, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const tagId = parseInt(params.tagId);
    const updateData = body as {
      name?: string;
      color?: string;
      description?: string;
      priority?: number;
    };
    
    const tag = await prisma.t2Tag.update({
      where: { id: tagId, store_id: employee.store_id },
      data: updateData,
    });
    
    return {
      success: true,
      data: { ...tag, created_at: tag.created_at.toISOString() },
    };
  })
  
  .delete("/tags/:tagId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const tagId = parseInt(params.tagId);
    await prisma.t2Tag.delete({
      where: { id: tagId, store_id: employee.store_id },
    });
    
    return { success: true, data: null };
  })
  
  // ============ PRODUCTS ============
  .get("/products", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    const categoryId = query.category_id ? parseInt(query.category_id) : undefined;
    const search = query.search as string | undefined;
    
    const where: any = { store_id: storeId };
    if (categoryId) where.category_id = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }
    
    const products = await prisma.t2Product.findMany({
      where,
      orderBy: { updated_at: "desc" },
    });
    
    const productsWithDetails = await Promise.all(
      products.map(p => getProductWithDetails(p.id))
    );
    
    return {
      success: true,
      data: productsWithDetails.filter(Boolean),
    };
  })
  
  .get("/products/:productId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const productId = parseInt(params.productId);
    const product = await getProductWithDetails(productId);
    
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    
    return { success: true, data: product };
  })
  
  .post("/products", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const {
      category_id,
      name,
      brand,
      model,
      price,
      quantity,
      image_url,
      specs,
      tag_ids,
    } = body as {
      category_id: number;
      name: string;
      brand?: string;
      model?: string;
      price: number;
      quantity?: number;
      image_url?: string;
      specs: { name: string; value: string }[];
      tag_ids: number[];
    };
    
    const product = await prisma.t2Product.create({
      data: {
        store_id: employee.store_id,
        category_id,
        name,
        brand,
        model,
        price,
        quantity: quantity || 1,
        image_url,
      },
    });
    
    // Add specs
    if (specs && specs.length > 0) {
      await prisma.t2ProductSpec.createMany({
        data: specs.map(s => ({
          product_id: product.id,
          spec_name: s.name,
          spec_value: s.value,
        })),
      });
    }
    
    // Add tags
    if (tag_ids && tag_ids.length > 0) {
      await prisma.t2ProductTag.createMany({
        data: tag_ids.map(tagId => ({
          product_id: product.id,
          tag_id: tagId,
        })),
      });
    }
    
    const productWithDetails = await getProductWithDetails(product.id);
    return { success: true, data: productWithDetails };
  })
  
  .put("/products/:productId", async ({ headers, params, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const productId = parseInt(params.productId);
    const {
      name,
      brand,
      model,
      price,
      quantity,
      image_url,
      specs,
      tag_ids,
    } = body as {
      name?: string;
      brand?: string;
      model?: string;
      price?: number;
      quantity?: number;
      image_url?: string;
      specs?: { name: string; value: string }[];
      tag_ids?: number[];
    };
    
    // Check ownership
    const existing = await prisma.t2Product.findFirst({
      where: { id: productId, store_id: employee.store_id },
    });
    
    if (!existing) {
      return { success: false, error: "Product not found" };
    }
    
    // Update product
    await prisma.t2Product.update({
      where: { id: productId },
      data: {
        name,
        brand,
        model,
        price,
        quantity,
        image_url,
        updated_at: new Date(),
      },
    });
    
    // Update specs if provided
    if (specs) {
      await prisma.t2ProductSpec.deleteMany({ where: { product_id: productId } });
      if (specs.length > 0) {
        await prisma.t2ProductSpec.createMany({
          data: specs.map(s => ({
            product_id: productId,
            spec_name: s.name,
            spec_value: s.value,
          })),
        });
      }
    }
    
    // Update tags if provided
    if (tag_ids) {
      await prisma.t2ProductTag.deleteMany({ where: { product_id: productId } });
      if (tag_ids.length > 0) {
        await prisma.t2ProductTag.createMany({
          data: tag_ids.map(tagId => ({
            product_id: productId,
            tag_id: tagId,
          })),
        });
      }
    }
    
    const productWithDetails = await getProductWithDetails(productId);
    return { success: true, data: productWithDetails };
  })
  
  .delete("/products/:productId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const productId = parseInt(params.productId);
    await prisma.t2Product.delete({
      where: { id: productId, store_id: employee.store_id },
    });
    
    return { success: true, data: null };
  })
  
  // ============ TARIFFS ============
  .get("/tariffs", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    
    const tariffs = await prisma.t2Tariff.findMany({
      where: { store_id: storeId },
      orderBy: { price: "asc" },
    });
    
    return {
      success: true,
      data: tariffs.map(t => ({
        ...t,
        created_at: t.created_at.toISOString(),
        updated_at: t.updated_at.toISOString(),
      })),
    };
  })
  
  .post("/tariffs", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const data = body as {
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
    };
    
    const tariff = await prisma.t2Tariff.create({
      data: {
        store_id: employee.store_id,
        ...data,
      },
    });
    
    return {
      success: true,
      data: {
        ...tariff,
        created_at: tariff.created_at.toISOString(),
        updated_at: tariff.updated_at.toISOString(),
      },
    };
  })
  
  .put("/tariffs/:tariffId", async ({ headers, params, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const tariffId = parseInt(params.tariffId);
    const data = body as {
      name?: string;
      price?: number;
      minutes?: number;
      sms?: number;
      gb?: number;
      unlimited_t2?: boolean;
      unlimited_internet?: boolean;
      unlimited_sms?: boolean;
      unlimited_calls?: boolean;
      unlimited_apps?: string;
      description?: string;
    };
    
    const tariff = await prisma.t2Tariff.update({
      where: { id: tariffId, store_id: employee.store_id },
      data: { ...data, updated_at: new Date() },
    });
    
    return {
      success: true,
      data: {
        ...tariff,
        created_at: tariff.created_at.toISOString(),
        updated_at: tariff.updated_at.toISOString(),
      },
    };
  })
  
  .delete("/tariffs/:tariffId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const tariffId = parseInt(params.tariffId);
    await prisma.t2Tariff.delete({
      where: { id: tariffId, store_id: employee.store_id },
    });
    
    return { success: true, data: null };
  })
  
  // ============ SERVICES ============
  .get("/services", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    
    const services = await prisma.t2Service.findMany({
      where: { store_id: storeId },
      orderBy: { name: "asc" },
    });
    
    return {
      success: true,
      data: services.map(s => ({
        ...s,
        created_at: s.created_at.toISOString(),
      })),
    };
  })
  
  .post("/services", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { name, price, description, for_smartphones_only } = body as {
      name: string;
      price: number;
      description?: string;
      for_smartphones_only?: boolean;
    };
    
    const service = await prisma.t2Service.create({
      data: {
        store_id: employee.store_id,
        name,
        price,
        description,
        for_smartphones_only: for_smartphones_only || false,
      },
    });
    
    return {
      success: true,
      data: { ...service, created_at: service.created_at.toISOString() },
    };
  })
  
  .put("/services/:serviceId", async ({ headers, params, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const serviceId = parseInt(params.serviceId);
    const data = body as {
      name?: string;
      price?: number;
      description?: string;
      for_smartphones_only?: boolean;
    };
    
    const service = await prisma.t2Service.update({
      where: { id: serviceId, store_id: employee.store_id },
      data,
    });
    
    return {
      success: true,
      data: { ...service, created_at: service.created_at.toISOString() },
    };
  })
  
  .delete("/services/:serviceId", async ({ headers, params }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const serviceId = parseInt(params.serviceId);
    await prisma.t2Service.delete({
      where: { id: serviceId, store_id: employee.store_id },
    });
    
    return { success: true, data: null };
  })
  
  // ============ SALES ============
  .get("/sales", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;
    
    const sales = await prisma.t2Sale.findMany({
      where: { store_id: storeId },
      include: {
        store: true,
        employee: true,
        items: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });
    
    return {
      success: true,
      data: sales.map(s => ({
        id: s.id,
        store_id: s.store_id,
        store_name: s.store.name,
        employee_id: s.employee_id,
        employee_name: s.employee.name,
        customer_request: s.customer_request,
        customer_audio_url: s.customer_audio_url,
        total_amount: s.total_amount,
        status: s.status,
        items: s.items.map(i => ({
          ...i,
          created_at: i.created_at.toISOString(),
        })),
        created_at: s.created_at.toISOString(),
      })),
    };
  })
  
  .get("/sales/my", async ({ headers }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const sales = await prisma.t2Sale.findMany({
      where: { employee_id: employee.id },
      include: {
        store: true,
        employee: true,
        items: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    
    return {
      success: true,
      data: sales.map(s => ({
        id: s.id,
        store_id: s.store_id,
        store_name: s.store.name,
        employee_id: s.employee_id,
        employee_name: s.employee.name,
        customer_request: s.customer_request,
        customer_audio_url: s.customer_audio_url,
        total_amount: s.total_amount,
        status: s.status,
        items: s.items.map(i => ({
          ...i,
          created_at: i.created_at.toISOString(),
        })),
        created_at: s.created_at.toISOString(),
      })),
    };
  })
  
  .post("/sales", async ({ headers, body }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { customer_request, customer_audio_url, items } = body as {
      customer_request?: string;
      customer_audio_url?: string;
      items: { item_type: string; item_id: number; quantity?: number }[];
    };
    
    let total = 0;
    const itemDetails: {
      item_type: string;
      item_id: number;
      item_name: string;
      item_details: string;
      price: number;
      quantity: number;
    }[] = [];
    
    for (const item of items) {
      const qty = item.quantity || 1;
      
      if (item.item_type === "product") {
        const product = await getProductWithDetails(item.item_id);
        if (product) {
          const specs = product.specs.map(s => `${s.spec_name}: ${s.spec_value}`).join(", ");
          total += product.price * qty;
          itemDetails.push({
            item_type: "product",
            item_id: item.item_id,
            item_name: product.name,
            item_details: specs,
            price: product.price,
            quantity: qty,
          });
        }
      } else if (item.item_type === "tariff") {
        const tariff = await prisma.t2Tariff.findUnique({ where: { id: item.item_id } });
        if (tariff) {
          const details = `${tariff.minutes || 0}мин, ${tariff.sms || 0}SMS, ${tariff.gb || 0}ГБ`;
          total += tariff.price * qty;
          itemDetails.push({
            item_type: "tariff",
            item_id: item.item_id,
            item_name: tariff.name,
            item_details: details,
            price: tariff.price,
            quantity: qty,
          });
        }
      } else if (item.item_type === "service") {
        const service = await prisma.t2Service.findUnique({ where: { id: item.item_id } });
        if (service) {
          total += service.price * qty;
          itemDetails.push({
            item_type: "service",
            item_id: item.item_id,
            item_name: service.name,
            item_details: service.description || "",
            price: service.price,
            quantity: qty,
          });
        }
      }
    }
    
    const sale = await prisma.t2Sale.create({
      data: {
        store_id: employee.store_id,
        employee_id: employee.id,
        customer_request,
        customer_audio_url,
        total_amount: total,
        status: "completed",
        items: {
          create: itemDetails,
        },
      },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });
    
    return {
      success: true,
      data: {
        id: sale.id,
        store_id: sale.store_id,
        store_name: sale.store.name,
        employee_id: sale.employee_id,
        employee_name: sale.employee.name,
        customer_request: sale.customer_request,
        customer_audio_url: sale.customer_audio_url,
        total_amount: sale.total_amount,
        status: sale.status,
        items: sale.items.map(i => ({
          ...i,
          created_at: i.created_at.toISOString(),
        })),
        created_at: sale.created_at.toISOString(),
      },
    };
  })
  
  // ============ SEARCH ============
  .get("/search", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const searchQuery = query.query as string;
    if (!searchQuery) {
      return { success: true, data: [] };
    }
    
    const products = await prisma.t2Product.findMany({
      where: {
        store_id: employee.store_id,
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { brand: { contains: searchQuery, mode: "insensitive" } },
          { model: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      orderBy: { updated_at: "desc" },
      take: 50,
    });
    
    const productsWithDetails = await Promise.all(
      products.map(p => getProductWithDetails(p.id))
    );
    
    return {
      success: true,
      data: productsWithDetails.filter(Boolean),
    };
  })
  
  // ============ STATS ============
  .get("/stats", async ({ headers, query }) => {
    const employee = await getT2Auth(headers.authorization);
    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }
    
    const storeId = query.store_id ? parseInt(query.store_id) : employee.store_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const productsCount = await prisma.t2Product.count({
      where: { store_id: storeId },
    });
    
    const salesToday = await prisma.t2Sale.count({
      where: {
        store_id: storeId,
        created_at: { gte: today },
      },
    });
    
    const revenueToday = await prisma.t2Sale.aggregate({
      where: {
        store_id: storeId,
        created_at: { gte: today },
      },
      _sum: { total_amount: true },
    });
    
    const totalSales = await prisma.t2Sale.count({
      where: { store_id: storeId },
    });
    
    const totalRevenue = await prisma.t2Sale.aggregate({
      where: { store_id: storeId },
      _sum: { total_amount: true },
    });
    
    return {
      success: true,
      data: {
        products_count: productsCount,
        sales_today: salesToday,
        revenue_today: revenueToday._sum.total_amount || 0,
        total_sales: totalSales,
        total_revenue: totalRevenue._sum.total_amount || 0,
      },
    };
  });

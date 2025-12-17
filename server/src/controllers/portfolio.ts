import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { AiService } from "../services/ai";
import { HhService } from "../services/hh";

export const portfolioController = (app: Elysia) =>
  app.use(authMiddleware).group("/api/portfolio", (app) =>
    app
      // Public endpoint
      .get("/", async () => {
        try {
          const about = await prisma.portfolioAbout.findFirst({
            orderBy: { id: "desc" },
          });

          const experience = await prisma.portfolioExperience.findMany({
            orderBy: { date_from: "desc" },
          });

          const skills = await prisma.portfolioSkill.findMany({
            orderBy: { name: "asc" },
          });

          const contacts = await prisma.portfolioContact.findMany();

          const cases = await prisma.portfolioCase.findMany({
            orderBy: { created_at: "desc" },
            include: {
              images: {
                orderBy: { order_index: "asc" },
              },
            },
          });

          return {
            success: true,
            data: {
              about: about?.description || null,
              experience,
              skills,
              contacts,
              cases: cases.map((c) => ({
                ...c,
                images: c.images.map((img) => img.image_url),
              })),
            },
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      })

      // Protected routes
      .post(
        "/about",
        async ({ body }) => {
          // Delete existing about (matching Rust behavior)
          await prisma.portfolioAbout.deleteMany();

          const about = await prisma.portfolioAbout.create({
            data: {
              description: body.description,
              updated_at: new Date(),
            },
          });
          return { success: true, data: about };
        },
        {
          body: t.Object({ description: t.String() }),
          isAuthorized: true,
        },
      )
      .put(
        "/about/:id",
        async ({ params: { id }, body }) => {
          const about = await prisma.portfolioAbout.update({
            where: { id: Number(id) },
            data: {
              description: body.description,
              updated_at: new Date(),
            },
          });
          return { success: true, data: about };
        },
        {
          body: t.Object({ description: t.String() }),
          isAuthorized: true,
        },
      )
      .delete(
        "/about",
        async () => {
          await prisma.portfolioAbout.deleteMany();
          return { success: true, data: "About deleted" };
        },
        { isAuthorized: true },
      )

      // Experience
      .post(
        "/experience",
        async ({ body }) => {
          const exp = await prisma.portfolioExperience.create({
            data: {
              ...body,
              created_at: new Date(),
            },
          });
          return { success: true, data: exp };
        },
        {
          body: t.Object({
            title: t.String(),
            company: t.String(),
            date_from: t.String(),
            date_to: t.Optional(t.String()),
            description: t.String(),
          }),
          isAuthorized: true,
        },
      )
      .put(
        "/experience/:id",
        async ({ params: { id }, body }) => {
          const exp = await prisma.portfolioExperience.update({
            where: { id: Number(id) },
            data: body,
          });
          return { success: true, data: exp };
        },
        {
          body: t.Object({
            title: t.String(),
            company: t.String(),
            date_from: t.String(),
            date_to: t.Optional(t.String()),
            description: t.String(),
          }),
          isAuthorized: true,
        },
      )
      .delete(
        "/experience/:id",
        async ({ params: { id } }) => {
          await prisma.portfolioExperience.delete({
            where: { id: Number(id) },
          });
          return { success: true, data: "Experience deleted" };
        },
        { isAuthorized: true },
      )

      // Skills
      .post(
        "/skills",
        async ({ body }) => {
          const skill = await prisma.portfolioSkill.create({
            data: {
              ...body,
              created_at: new Date(),
            },
          });
          return { success: true, data: skill };
        },
        {
          body: t.Object({
            name: t.String(),
            category: t.Optional(t.String()),
          }),
          isAuthorized: true,
        },
      )
      .delete(
        "/skills/:id",
        async ({ params: { id } }) => {
          await prisma.portfolioSkill.delete({
            where: { id: Number(id) },
          });
          return { success: true, data: "Skill deleted" };
        },
        { isAuthorized: true },
      )

      // Contacts
      .post(
        "/contacts",
        async ({ body }) => {
          const contact = await prisma.portfolioContact.create({
            data: {
              type: body.contact_type,
              value: body.value,
              label: body.label,
              created_at: new Date(),
            },
          });
          return { success: true, data: contact };
        },
        {
          body: t.Object({
            contact_type: t.String(),
            value: t.String(),
            label: t.Optional(t.String()),
          }),
          isAuthorized: true,
        },
      )
      .delete(
        "/contacts/:id",
        async ({ params: { id } }) => {
          await prisma.portfolioContact.delete({
            where: { id: Number(id) },
          });
          return { success: true, data: "Contact deleted" };
        },
        { isAuthorized: true },
      )

      // Cases
      .post(
        "/cases",
        async ({ body }) => {
          const { title, description, main_image, website_url, images } = body;

          const result = await prisma.$transaction(async (tx) => {
            const portfolioCase = await tx.portfolioCase.create({
              data: {
                title,
                description,
                main_image,
                website_url,
                created_at: new Date(),
              },
            });

            if (images && images.length > 0) {
              await tx.portfolioCaseImage.createMany({
                data: images.map((url, index) => ({
                  case_id: portfolioCase.id,
                  image_url: url,
                  order_index: index,
                })),
              });
            }

            return portfolioCase;
          });

          const fullCase = await prisma.portfolioCase.findUnique({
            where: { id: result.id },
            include: { images: { orderBy: { order_index: "asc" } } },
          });

          return {
            success: true,
            data: {
              ...fullCase,
              images: fullCase?.images.map((img) => img.image_url) || [],
            },
          };
        },
        {
          body: t.Object({
            title: t.String(),
            description: t.String(),
            main_image: t.String(),
            website_url: t.Optional(t.String()),
            images: t.Array(t.String()),
          }),
          isAuthorized: true,
        },
      )
      .delete(
        "/cases/:id",
        async ({ params: { id } }) => {
          await prisma.portfolioCase.delete({
            where: { id: Number(id) },
          });
          return { success: true, data: "Case deleted" };
        },
        { isAuthorized: true },
      )

      // AI Improve
      .post(
        "/improve-about",
        async ({ body }) => {
          const aiService = new AiService(
            process.env.OPENROUTER_API_KEY || "",
            process.env.AI_MODEL || "google/gemini-2.0-flash-001",
          );
          const improvedText = await aiService.improveAboutText(body.text);
          return { success: true, data: { improved_text: improvedText } };
        },
        {
          body: t.Object({ text: t.String() }),
          isAuthorized: true,
        },
      )

      // HH Resumes
      .get(
        "/hh-resumes",
        async () => {
          const tokenRecord =
            (await prisma.$queryRaw`SELECT access_token FROM hh_tokens ORDER BY created_at DESC LIMIT 1`) as any[];
          const token = tokenRecord?.[0]?.access_token;

          if (!token) {
            return {
              success: false,
              error: "HH.ru не подключен. Авторизуйтесь через настройки.",
            };
          }

          const hhService = new HhService();
          hhService.setToken(token);
          try {
            const resumes = await hhService.getResumes();
            return { success: true, data: resumes };
          } catch (error: any) {
            return { success: false, error: error.message };
          }
        },
        { isAuthorized: true },
      ),
  );

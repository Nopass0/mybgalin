import { Elysia, t } from 'elysia';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { parseUserAgent, isBot as checkIsBot } from '../utils/ua';
import { randomBytes } from 'crypto';

/**
 * Helper to generate a short code if none provided.
 */
function generateShortCode(): string {
  return randomBytes(4).toString('hex'); // 8 characters
}

/**
 * Helper to shorten URL using is.gd API (matching Rust implementation).
 */
async function shortenWithIsGd(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (error) {
    console.error('is.gd shortening error:', error);
    return null;
  }
}

export const linksController = (app: Elysia) =>
  app
    .use(authMiddleware)
    .group('/api/links', (app) =>
      app
        // List all links (admin only)
        .get('/', async () => {
          const links = await prisma.shortLink.findMany({
            orderBy: { created_at: 'desc' }
          });
          return { success: true, data: links };
        }, {
          isAuthorized: true,
          detail: { summary: 'List all short links', tags: ['Links'] }
        })
        // Create a new link (admin only)
        .post('/', async ({ body }) => {
          const id = crypto.randomUUID();
          const short_code = generateShortCode();
          const base_url = process.env.BASE_URL || 'https://bgalin.ru';
          const our_short_url = `${base_url}/l/${short_code}`;

          let external_short_url = null;
          if (body.use_external_shortener) {
            external_short_url = await shortenWithIsGd(our_short_url);
          }

          const link = await prisma.shortLink.create({
            data: {
              id,
              name: body.name,
              original_url: body.original_url,
              short_code,
              external_short_url,
              redirect_to_studio: body.redirect_to_studio ?? false,
              set_studio_flag: body.set_studio_flag ?? false,
              custom_js: body.custom_js,
              expires_at: body.expires_at ? new Date(body.expires_at) : null,
              is_active: true,
            }
          });

          return { success: true, data: link };
        }, {
          isAuthorized: true,
          body: t.Object({
            name: t.String(),
            original_url: t.String(),
            redirect_to_studio: t.Optional(t.Boolean()),
            set_studio_flag: t.Optional(t.Boolean()),
            custom_js: t.Optional(t.String()),
            expires_at: t.Optional(t.String()),
            use_external_shortener: t.Optional(t.Boolean()),
          }),
          detail: { summary: 'Create a new short link', tags: ['Links'] }
        })
        // Update a link (admin only)
        .put('/:id', async ({ params: { id }, body }) => {
          const link = await prisma.shortLink.update({
            where: { id },
            data: {
              ...body,
              expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
              updated_at: new Date(),
            }
          });
          return { success: true, data: link };
        }, {
          isAuthorized: true,
          body: t.Object({
            name: t.Optional(t.String()),
            original_url: t.Optional(t.String()),
            is_active: t.Optional(t.Boolean()),
            redirect_to_studio: t.Optional(t.Boolean()),
            set_studio_flag: t.Optional(t.Boolean()),
            custom_js: t.Optional(t.String()),
            expires_at: t.Optional(t.String()),
          }),
          detail: { summary: 'Update a short link', tags: ['Links'] }
        })
        // Delete a link (admin only)
        .delete('/:id', async ({ params: { id } }) => {
          await prisma.shortLink.delete({ where: { id } });
          return { success: true, data: 'Link deleted' };
        }, {
          isAuthorized: true,
          detail: { summary: 'Delete a short link', tags: ['Links'] }
        })
        // Get link statistics (admin only)
        .get('/:id/stats', async ({ params: { id } }) => {
          const link = await prisma.shortLink.findUnique({
            where: { id },
            include: {
              clicks: {
                orderBy: { clicked_at: 'desc' },
                take: 50
              }
            }
          });

          if (!link) return { success: false, error: 'Link not found' };

          const totalClicks = await prisma.linkClick.count({ where: { link_id: id } });

          // Basic aggregation (in a real app, you'd use more complex queries)
          return {
            success: true,
            data: {
              link,
              total_clicks: totalClicks,
              recent_clicks: link.clicks
            }
          };
        }, {
          isAuthorized: true,
          detail: { summary: 'Get link statistics', tags: ['Links'] }
        })
    )
    // Public redirect route
    .get('/l/:code', async ({ params: { code }, request, set }) => {
      const link = await prisma.shortLink.findUnique({
        where: { short_code: code }
      });

      if (!link || !link.is_active) {
        set.status = 404;
        return 'Link not found or inactive';
      }

      // Check expiration
      if (link.expires_at && link.expires_at < new Date()) {
        set.status = 410; // Gone
        return 'Link has expired';
      }

      // Track click (asynchronous)
      const uaString = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer');
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const { browser, os, device } = parseUserAgent(uaString);
      const isBot = checkIsBot(uaString);

      prisma.linkClick.create({
        data: {
          link_id: link.id,
          ip_address: ip,
          user_agent: uaString,
          referer,
          browser,
          os,
          device_type: device,
          is_bot: isBot,
          clicked_at: new Date(),
        }
      }).catch(err => console.error('Failed to track click:', err));

      // If custom JS is provided, we might need to render a page instead of a direct redirect
      if (link.custom_js) {
        set.headers['content-type'] = 'text/html';
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Redirecting...</title>
              <script>
                ${link.custom_js}
                window.location.href = "${link.original_url}";
              </script>
            </head>
            <body>
              <p>Redirecting to <a href="${link.original_url}">${link.original_url}</a>...</p>
            </body>
          </html>
        `;
      }

      set.redirect = link.original_url;
    }, {
      detail: { summary: 'Redirect to original URL', tags: ['Links'] }
    });

import { prisma } from '../db';

export interface SheetAnimeRow {
  date?: string;
  title: string;
  watched: boolean;
  season?: string;
  episodes?: string;
  voice_acting?: string;
  buyer?: string;
  chat_rating?: number;
  sheikh_rating?: number;
  streamer_rating?: number;
  vod_link?: string;
  year: number;
}

export interface ShikimoriAnime {
  id: number;
  name: string;
  russian?: string;
  score?: string;
}

export interface ShikimoriGenre {
  id: number;
  name: string;
  russian: string;
  kind: string;
}

export interface ShikimoriAnimeDetails {
  id: number;
  name: string;
  russian?: string;
  description?: string;
  score?: string;
  genres?: ShikimoriGenre[];
}

export class GoogleSheetsClient {
  private sheetId: string;

  constructor(sheetId: string) {
    this.sheetId = sheetId;
  }

  async fetchSheetData(year: number): Promise<SheetAnimeRow[]> {
    const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${year}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Sheets error: ${response.status}`);
    }

    const csvText = await response.text();
    return this.parseCsv(csvText, year);
  }

  private parseCsv(csvText: string, year: number): SheetAnimeRow[] {
    // Simple CSV parser for this specific format
    const lines = csvText.split(/\r?\n/);
    const rows: SheetAnimeRow[] = [];

    // Skip first 13 rows (data starts from row 14)
    for (let i = 13; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Split by comma, but handle quoted values
      const record = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());

      if (record.length < 2 || !record[1]) continue;

      const date = record[0] || undefined;
      const title = record[1];
      const watchedStr = record[2]?.toLowerCase();
      const watched = watchedStr === 'да' || watchedStr === 'yes' || watchedStr === 'true' || watchedStr === '+';
      const season = record[3] || undefined;
      const episodes = record[4] || undefined;
      const voice_acting = record[5] || undefined;
      const buyer = record[6] || undefined;
      const chat_rating = parseFloat(record[7]?.replace(',', '.')) || undefined;
      const sheikh_rating = parseFloat(record[8]?.replace(',', '.')) || undefined;
      const streamer_rating = parseFloat(record[9]?.replace(',', '.')) || undefined;
      const vod_link = record[10] || undefined;

      rows.push({
        date,
        title,
        watched,
        season,
        episodes,
        voice_acting,
        buyer,
        chat_rating,
        sheikh_rating,
        streamer_rating,
        vod_link,
        year
      });
    }

    return rows;
  }
}

export class ShikimoriClient {
  private baseUrl = 'https://shikimori.one/api';

  async searchAnime(query: string): Promise<ShikimoriAnime[]> {
    const url = new URL(`${this.baseUrl}/animes`);
    url.searchParams.append('search', query);
    url.searchParams.append('limit', '5');
    url.searchParams.append('order', 'popularity');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'BGalin Portfolio (bgalin.ru)' }
    });

    if (!response.ok) throw new Error(`Shikimori API error: ${response.status}`);
    return await response.json() as ShikimoriAnime[];
  }

  async getAnimeDetails(id: number): Promise<ShikimoriAnimeDetails> {
    const response = await fetch(`${this.baseUrl}/animes/${id}`, {
      headers: { 'User-Agent': 'BGalin Portfolio (bgalin.ru)' }
    });

    if (!response.ok) throw new Error(`Shikimori API error: ${response.status}`);
    return await response.json() as ShikimoriAnimeDetails;
  }

  getCoverUrl(id: number): string {
    return `https://shikimori.one/system/animes/original/${id}.jpg`;
  }

  static prepareTitleForSearch(title: string): string {
    return title.split('(')[0].trim();
  }
}

export class AnimeService {
  private static SHEET_ID = '1Dr02PNJp4W6lJnI31ohN-jkZWIL4Jylww6vVrPVrYfs';

  static async runSyncTask(progressId: number) {
    const sheetsClient = new GoogleSheetsClient(this.SHEET_ID);
    const shikimoriClient = new ShikimoriClient();

    let totalSynced = 0;
    let totalErrors = 0;

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

    await prisma.animeSyncProgress.update({
      where: { id: progressId },
      data: { total: BigInt(years.length), message: 'Загрузка данных...' }
    });

    for (let i = 0; i < years.length; i++) {
      const year = years[i];

      await prisma.animeSyncProgress.update({
        where: { id: progressId },
        data: {
          current: BigInt(i + 1),
          message: `Обработка ${year} года... (${i + 1}/${years.length})`
        }
      });

      try {
        const rows = await sheetsClient.fetchSheetData(year);

        for (const row of rows) {
          try {
            const existing = await prisma.animeAuction.findFirst({
              where: { title: row.title, year: row.year }
            });

            const sheetsUrl = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/edit#gid=${year - 2020}`;

            if (existing) {
              await prisma.animeAuction.update({
                where: { id: existing.id },
                data: {
                  date: row.date,
                  watched: row.watched,
                  season: row.season,
                  episodes: row.episodes,
                  voice_acting: row.voice_acting,
                  buyer: row.buyer,
                  chat_rating: row.chat_rating,
                  sheikh_rating: row.sheikh_rating,
                  streamer_rating: row.streamer_rating,
                  vod_link: row.vod_link,
                  sheets_url: sheetsUrl,
                  updated_at: new Date()
                }
              });
              totalSynced++;
            } else {
              const searchTitle = ShikimoriClient.prepareTitleForSearch(row.title);
              const searchResults = await shikimoriClient.searchAnime(searchTitle).catch(() => []);
              const shikimoriAnime = searchResults[0];

              let shikimoriDetails: ShikimoriAnimeDetails | null = null;
              if (shikimoriAnime) {
                shikimoriDetails = await shikimoriClient.getAnimeDetails(shikimoriAnime.id).catch(() => null);
              }

              await prisma.animeAuction.create({
                data: {
                  date: row.date,
                  title: row.title,
                  watched: row.watched,
                  season: row.season,
                  episodes: row.episodes,
                  voice_acting: row.voice_acting,
                  buyer: row.buyer,
                  chat_rating: row.chat_rating,
                  sheikh_rating: row.sheikh_rating,
                  streamer_rating: row.streamer_rating,
                  vod_link: row.vod_link,
                  sheets_url: sheetsUrl,
                  year: row.year,
                  shikimori_id: shikimoriAnime?.id,
                  shikimori_name: shikimoriAnime?.russian || shikimoriAnime?.name,
                  shikimori_description: shikimoriDetails?.description,
                  shikimori_cover: shikimoriAnime ? shikimoriClient.getCoverUrl(shikimoriAnime.id) : null,
                  shikimori_score: shikimoriAnime?.score ? parseFloat(shikimoriAnime.score) : null,
                  shikimori_genres: shikimoriDetails?.genres?.map(g => g.russian).join(', '),
                }
              });
              totalSynced++;
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (err) {
            console.error(`Error syncing anime ${row.title}:`, err);
            totalErrors++;
          }
        }
      } catch (err) {
        console.error(`Error fetching sheet for year ${year}:`, err);
        totalErrors++;
      }
    }

    const finalMessage = `✅ Завершено! Синхронизировано: ${totalSynced}, ошибок: ${totalErrors}`;
    await prisma.animeSyncProgress.update({
      where: { id: progressId },
      data: {
        status: 'completed',
        current: BigInt(years.length),
        message: finalMessage,
        finished_at: new Date()
      }
    });
  }
}

"use client";

import { useEffect, useState, useRef } from "react";
import axios from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Calendar,
  Star,
  Tv,
  ExternalLink,
  Search,
  Link,
} from "lucide-react";

interface AnimeAuction {
  id: number;
  date: string | null;
  title: string;
  watched: number;
  season: string | null;
  episodes: string | null;
  voice_acting: string | null;
  buyer: string | null;
  chat_rating: number | null;
  sheikh_rating: number | null;
  streamer_rating: number | null;
  vod_link: string | null;
  sheets_url: string | null;
  year: number;
  shikimori_id: number | null;
  shikimori_name: string | null;
  shikimori_description: string | null;
  shikimori_cover: string | null;
  shikimori_score: number | null;
  shikimori_genres: string | null;
}

interface GroupedAnime {
  date: string;
  animes: AnimeAuction[];
}

interface SyncProgress {
  id: number;
  status: string;
  current: number;
  total: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
}

export default function AnimePage() {
  const [upcomingAnime, setUpcomingAnime] = useState<AnimeAuction[]>([]);
  const [watchedAnime, setWatchedAnime] = useState<AnimeAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnime = async () => {
    setLoading(true);
    try {
      const [upcomingRes, watchedRes] = await Promise.all([
        axios.get("/anime/upcoming"),
        axios.get("/anime/watched"),
      ]);

      if (upcomingRes.data.success) {
        setUpcomingAnime(
          upcomingRes.data.data.map((item: any) => item.anime || item),
        );
      }
      if (watchedRes.data.success) {
        setWatchedAnime(
          watchedRes.data.data.map((item: any) => item.anime || item),
        );
      }
    } catch (error) {
      console.error("Failed to fetch anime:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncProgress = async () => {
    try {
      const response = await axios.get("/anime/sync/progress");
      if (response.data.success && response.data.data) {
        const newProgress = response.data.data;
        const oldStatus = syncProgress?.status;

        setSyncProgress(newProgress);

        // If sync just completed, refresh anime list and show notification
        if (newProgress.status === "completed" && oldStatus === "running") {
          console.log("Sync completed! Refreshing anime list...");

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          await fetchAnime();

          // Show success message
          setTimeout(() => {
            alert(newProgress.message || "Синхронизация завершена!");
          }, 500);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sync progress:", error);
    }
  };

  const startSyncPolling = () => {
    if (progressIntervalRef.current) return;

    progressIntervalRef.current = setInterval(() => {
      fetchSyncProgress();
    }, 1000); // Poll every second
  };

  const stopSyncPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const syncAnime = async () => {
    try {
      const response = await axios.post("/anime/sync");
      if (response.data.success) {
        startSyncPolling();
      } else {
        alert(response.data.error || "Ошибка синхронизации");
      }
    } catch (error) {
      console.error("Failed to start sync:", error);
      alert("Ошибка запуска синхронизации");
    }
  };

  useEffect(() => {
    fetchAnime();
    fetchSyncProgress(); // Check if sync is running on mount

    return () => {
      stopSyncPolling();
    };
  }, []);

  // Auto-start polling if sync is running
  useEffect(() => {
    if (syncProgress?.status === "running") {
      startSyncPolling();
    } else {
      stopSyncPolling();
    }
  }, [syncProgress?.status]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Дата не указана";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getAverageRating = (anime: AnimeAuction) => {
    const ratings = [
      anime.chat_rating,
      anime.sheikh_rating,
      anime.streamer_rating,
    ].filter((r) => r !== null) as number[];

    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const filterAnime = (animes: AnimeAuction[]) => {
    if (!searchQuery.trim()) return animes;

    const query = searchQuery.toLowerCase();
    return animes.filter((anime) => {
      const titleMatch = anime.title.toLowerCase().includes(query);
      const genresMatch = anime.shikimori_genres?.toLowerCase().includes(query);
      const buyerMatch = anime.buyer?.toLowerCase().includes(query);
      const voiceMatch = anime.voice_acting?.toLowerCase().includes(query);

      return titleMatch || genresMatch || buyerMatch || voiceMatch;
    });
  };

  const groupAnimeByDate = (animes: AnimeAuction[]): GroupedAnime[] => {
    const groups: { [key: string]: AnimeAuction[] } = {};

    animes.forEach((anime) => {
      const dateKey = anime.date || "Без даты";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(anime);
    });

    // Sort by date (newest first)
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => {
        if (dateA === "Без даты") return 1;
        if (dateB === "Без даты") return -1;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .map(([date, animes]) => ({ date, animes }));
  };

  const AnimeCard = ({ anime }: { anime: AnimeAuction }) => {
    const avgRating = getAverageRating(anime);

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Cover Image - Bigger and Rounded */}
          <div className="md:w-64 flex-shrink-0">
            {anime.shikimori_cover ? (
              <img
                src={anime.shikimori_cover}
                alt={anime.title}
                className="w-full h-80 md:h-full object-cover rounded-l-lg"
              />
            ) : (
              <div className="w-full h-80 md:h-full bg-muted flex items-center justify-center rounded-l-lg">
                <Tv className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">{anime.title}</h3>
                {anime.shikimori_name &&
                  anime.shikimori_name !== anime.title && (
                    <p className="text-base text-muted-foreground mb-2">
                      {anime.shikimori_name}
                    </p>
                  )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  {anime.season && <span>{anime.season}</span>}
                  {anime.episodes && <span>• {anime.episodes}</span>}
                </div>
              </div>

              {anime.shikimori_score && (
                <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full ml-4">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                  <span className="font-bold text-primary text-lg">
                    {anime.shikimori_score}
                  </span>
                </div>
              )}
            </div>

            {/* Genres */}
            {anime.shikimori_genres && (
              <div className="flex flex-wrap gap-2 mb-4">
                {anime.shikimori_genres.split(", ").map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {anime.shikimori_description && (
              <p className="text-base text-muted-foreground mb-4 line-clamp-3">
                {anime.shikimori_description}
              </p>
            )}

            {/* Voice Acting */}
            {anime.voice_acting && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Озвучка: </span>
                <span className="text-sm font-medium">
                  {anime.voice_acting}
                </span>
              </div>
            )}

            {/* Ratings */}
            {avgRating && (
              <div className="mb-4">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Средняя: </span>
                    <span className="font-bold text-lg">{avgRating}/10</span>
                  </div>
                  {anime.chat_rating && (
                    <div>
                      <span className="text-muted-foreground">Чат: </span>
                      <span className="font-semibold">{anime.chat_rating}</span>
                    </div>
                  )}
                  {anime.sheikh_rating && (
                    <div>
                      <span className="text-muted-foreground">Шейх: </span>
                      <span className="font-semibold">
                        {anime.sheikh_rating}
                      </span>
                    </div>
                  )}
                  {anime.streamer_rating && (
                    <div>
                      <span className="text-muted-foreground">Стример: </span>
                      <span className="font-semibold">
                        {anime.streamer_rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3">
              {anime.vod_link && (
                <a
                  href={anime.vod_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Смотреть VOD
                </a>
              )}
              {anime.sheets_url && (
                <a
                  href={anime.sheets_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Link className="h-4 w-4" />
                  Google Sheets
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const filteredUpcoming = filterAnime(upcomingAnime);
  const filteredWatched = filterAnime(watchedAnime);

  const groupedUpcoming = groupAnimeByDate(filteredUpcoming);
  const groupedWatched = groupAnimeByDate(filteredWatched);

  const isSyncing = syncProgress?.status === "running";
  const syncPercentage = syncProgress?.total
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  if (loading && !isSyncing) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Аниме Аукцион</h1>
          <p className="text-muted-foreground">
            HellYeahPlay Anime Auction - отслеживание просмотренных и
            запланированных аниме
          </p>
        </div>

        {isSyncing ? (
          <div className="min-w-[300px]">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Синхронизация {syncPercentage}%
              </span>
            </div>
            <Progress value={syncPercentage} className="h-2 mb-1" />
            {syncProgress?.message && (
              <p className="text-xs text-muted-foreground">
                {syncProgress.message}
              </p>
            )}
          </div>
        ) : (
          <Button onClick={syncAnime} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Синхронизировать
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по названию, жанрам, озвучке..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">
            Запланированные ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="watched">
            Просмотренные ({filteredWatched.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-8">
          {groupedUpcoming.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Ничего не найдено"
                  : "Нет запланированных аниме"}
              </p>
            </div>
          ) : (
            groupedUpcoming.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background py-2 z-10">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">
                    {group.date === "Без даты"
                      ? group.date
                      : formatDate(group.date)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({group.animes.length})
                  </span>
                </div>
                <div className="grid gap-4">
                  {group.animes.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="watched" className="space-y-8">
          {groupedWatched.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery ? "Ничего не найдено" : "Нет просмотренных аниме"}
              </p>
            </div>
          ) : (
            groupedWatched.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background py-2 z-10">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">
                    {group.date === "Без даты"
                      ? group.date
                      : formatDate(group.date)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({group.animes.length})
                  </span>
                </div>
                <div className="grid gap-4">
                  {group.animes.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

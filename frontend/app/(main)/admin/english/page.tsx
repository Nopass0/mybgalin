'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Brain,
  Gamepad2,
  BarChart3,
  Settings,
  Plus,
  Play,
  Trophy,
  Flame,
  Star,
  Target,
  Volume2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Sparkles,
  Zap,
  GraduationCap,
  Clock,
  TrendingUp,
  Award,
  BookMarked,
  MessageCircle,
  Lightbulb,
  Download,
  Upload,
  Search,
  Filter,
  RotateCcw,
  Eye,
  EyeOff,
  Keyboard,
  Shuffle,
  Timer,
  Heart,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Layers,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

// Types
interface Category {
  id: number;
  name: string;
  name_ru: string;
  description: string | null;
  icon: string | null;
  color: string;
  word_count: number;
  display_order: number;
}

interface Word {
  id: number;
  category_id: number | null;
  word: string;
  transcription: string | null;
  translation: string;
  definition: string | null;
  part_of_speech: string | null;
  examples: string | null;
  synonyms: string | null;
  antonyms: string | null;
  audio_url: string | null;
  image_url: string | null;
  difficulty: number;
  frequency: number;
  cefr_level: string | null;
}

interface WordProgress {
  id: number;
  word_id: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string | null;
  last_review: string | null;
  correct_count: number;
  incorrect_count: number;
  status: string;
  mastery_level: number;
}

interface WordWithProgress extends Word {
  progress: WordProgress | null;
  category_name: string | null;
}

interface DashboardStats {
  total_words: number;
  words_learned: number;
  words_to_review: number;
  current_streak: number;
  total_xp: number;
  level: number;
  today_words_learned: number;
  today_goal: number;
  weekly_progress: { date: string; words_learned: number; words_reviewed: number; xp_earned: number }[];
  category_progress: { category_id: number; category_name: string; total_words: number; learned_words: number; mastery_percent: number }[];
}

interface Settings {
  daily_goal_words: number;
  daily_goal_minutes: number;
  preferred_difficulty: number;
  show_transcription: boolean;
  show_examples: boolean;
  auto_play_audio: boolean;
  review_notification: boolean;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
}

interface Achievement {
  id: number;
  achievement_type: string;
  title: string;
  description: string;
  icon: string | null;
  xp_reward: number;
  unlocked_at: string | null;
}

interface QuizQuestion {
  id: number;
  question_type: string;
  word: Word;
  options: string[];
  correct_answer: string;
}

// Icon mapping
const iconMap: Record<string, any> = {
  book: BookOpen,
  plane: Globe,
  briefcase: Target,
  cpu: Zap,
  utensils: Heart,
  heart: Heart,
  leaf: Sparkles,
  smile: Star,
  zap: Zap,
  'message-circle': MessageCircle,
  star: Star,
  'book-open': BookOpen,
  library: BookMarked,
  'graduation-cap': GraduationCap,
  flame: Flame,
  trophy: Trophy,
  award: Award,
  'check-circle': Check,
  clock: Clock,
};

export default function EnglishLearningPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<WordWithProgress[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Flashcard state
  const [flashcards, setFlashcards] = useState<WordWithProgress[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardMode, setFlashcardMode] = useState<'new' | 'review' | 'mixed'>('mixed');

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizType, setQuizType] = useState<'translation' | 'word' | 'mixed'>('mixed');

  // Add word dialog
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
    translation: '',
    transcription: '',
    definition: '',
    examples: '',
    part_of_speech: '',
    category_id: 1,
    difficulty: 1,
  });

  // Import dialog
  const [showImport, setShowImport] = useState(false);
  const [importCount, setImportCount] = useState(100);

  // Word Match game state
  const [matchPairs, setMatchPairs] = useState<{ id: number; text: string; type: 'word' | 'translation'; matched: boolean; selected: boolean }[]>([]);
  const [matchSelected, setMatchSelected] = useState<number | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [matchErrors, setMatchErrors] = useState(0);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, dashRes, settingsRes, achieveRes] = await Promise.all([
        api.get('/api/english/categories'),
        api.get('/api/english/dashboard'),
        api.get('/api/english/settings'),
        api.get('/api/english/achievements'),
      ]);

      if (catRes.data.success) setCategories(catRes.data.data);
      if (dashRes.data.success) setDashboard(dashRes.data.data);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
      if (achieveRes.data.success) setAchievements(achieveRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch words
  const fetchWords = async (categoryId?: number | null) => {
    try {
      const params = categoryId ? `?category_id=${categoryId}` : '';
      const res = await api.get(`/api/english/words${params}`);
      if (res.data.success) setWords(res.data.data);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  // Start flashcard session
  const startFlashcards = async () => {
    try {
      const params = new URLSearchParams({
        count: '20',
        mode: flashcardMode,
      });
      if (selectedCategory) params.append('category_id', selectedCategory.toString());

      const res = await api.get(`/api/english/flashcards?${params}`);
      if (res.data.success && res.data.data.words.length > 0) {
        setFlashcards(res.data.data.words);
        setCurrentFlashcardIndex(0);
        setIsFlipped(false);
        setActiveTab('flashcards');
      } else {
        toast({ title: 'No words', description: 'Add some words first to start learning!' });
      }
    } catch (error) {
      console.error('Error starting flashcards:', error);
    }
  };

  // Submit flashcard review
  const submitReview = async (quality: number) => {
    const currentWord = flashcards[currentFlashcardIndex];
    try {
      await api.post('/api/english/review', {
        word_id: currentWord.id,
        quality,
      });

      // Move to next card
      if (currentFlashcardIndex < flashcards.length - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        toast({ title: 'Session Complete!', description: 'Great job! You finished all flashcards.' });
        setActiveTab('dashboard');
        fetchData();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Start quiz
  const startQuiz = async () => {
    try {
      const params = new URLSearchParams({
        count: '10',
        quiz_type: quizType,
      });
      if (selectedCategory) params.append('category_id', selectedCategory.toString());

      const res = await api.get(`/api/english/quiz?${params}`);
      if (res.data.success && res.data.data.length > 0) {
        setQuizQuestions(res.data.data);
        setCurrentQuizIndex(0);
        setQuizScore(0);
        setQuizAnswered(false);
        setSelectedAnswer(null);
        setQuizStartTime(Date.now());
        setActiveTab('quiz');
      } else {
        toast({ title: 'No words', description: 'Add some words first to start a quiz!' });
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  // Answer quiz question
  const answerQuiz = (answer: string) => {
    if (quizAnswered) return;

    setSelectedAnswer(answer);
    setQuizAnswered(true);

    const currentQ = quizQuestions[currentQuizIndex];
    if (answer === currentQ.correct_answer) {
      setQuizScore(prev => prev + 1);
    }
  };

  // Next quiz question
  const nextQuizQuestion = async () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setQuizAnswered(false);
      setSelectedAnswer(null);
    } else {
      // Quiz finished - save results
      const timeSpent = Math.round((Date.now() - quizStartTime) / 1000);
      try {
        await api.post('/api/english/quiz/result', {
          quiz_type: quizType,
          category_id: selectedCategory,
          score: Math.round((quizScore / quizQuestions.length) * 100),
          total_questions: quizQuestions.length,
          correct_answers: quizScore,
          time_spent_seconds: timeSpent,
        });
      } catch (error) {
        console.error('Error saving quiz result:', error);
      }

      toast({
        title: 'Quiz Complete!',
        description: `Score: ${quizScore}/${quizQuestions.length} (${Math.round((quizScore / quizQuestions.length) * 100)}%)`,
      });
      setActiveTab('dashboard');
      fetchData();
    }
  };

  // Start Word Match game
  const startWordMatch = async () => {
    try {
      const params = new URLSearchParams({ count: '6', mode: 'mixed' });
      if (selectedCategory) params.append('category_id', selectedCategory.toString());

      const res = await api.get(`/api/english/flashcards?${params}`);
      if (res.data.success && res.data.data.words.length >= 4) {
        const words = res.data.data.words.slice(0, 6);
        const pairs: typeof matchPairs = [];

        words.forEach((w: WordWithProgress, idx: number) => {
          pairs.push({ id: idx * 2, text: w.word, type: 'word', matched: false, selected: false });
          pairs.push({ id: idx * 2 + 1, text: w.translation, type: 'translation', matched: false, selected: false });
        });

        // Shuffle pairs
        for (let i = pairs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }

        setMatchPairs(pairs);
        setMatchSelected(null);
        setMatchScore(0);
        setMatchErrors(0);
        setActiveTab('match');
      } else {
        toast({ title: 'Not enough words', description: 'Add at least 4 words to play!' });
      }
    } catch (error) {
      console.error('Error starting word match:', error);
    }
  };

  // Handle Word Match selection
  const handleMatchSelect = (idx: number) => {
    const pair = matchPairs[idx];
    if (pair.matched) return;

    if (matchSelected === null) {
      setMatchSelected(idx);
      setMatchPairs(prev => prev.map((p, i) => i === idx ? { ...p, selected: true } : p));
    } else {
      const firstPair = matchPairs[matchSelected];

      // Check if it's a match (same word-translation pair)
      const firstIdx = Math.floor(firstPair.id / 2);
      const secondIdx = Math.floor(pair.id / 2);

      if (firstIdx === secondIdx && firstPair.type !== pair.type) {
        // Match!
        setMatchPairs(prev => prev.map((p, i) =>
          i === idx || i === matchSelected ? { ...p, matched: true, selected: false } : p
        ));
        setMatchScore(prev => prev + 1);

        // Check if game complete
        const remaining = matchPairs.filter(p => !p.matched).length;
        if (remaining === 2) {
          setTimeout(() => {
            toast({ title: 'Game Complete!', description: `Errors: ${matchErrors}. Great job!` });
            setActiveTab('dashboard');
            fetchData();
          }, 500);
        }
      } else {
        // No match
        setMatchErrors(prev => prev + 1);
        setMatchPairs(prev => prev.map((p, i) =>
          i === idx ? { ...p, selected: true } : p
        ));

        setTimeout(() => {
          setMatchPairs(prev => prev.map(p => ({ ...p, selected: false })));
        }, 800);
      }

      setMatchSelected(null);
    }
  };

  // Add word
  const handleAddWord = async () => {
    try {
      await api.post('/api/english/words', newWord);
      toast({ title: 'Success', description: 'Word added!' });
      setShowAddWord(false);
      setNewWord({
        word: '',
        translation: '',
        transcription: '',
        definition: '',
        examples: '',
        part_of_speech: '',
        category_id: 1,
        difficulty: 1,
      });
      fetchData();
    } catch (error) {
      console.error('Error adding word:', error);
      toast({ title: 'Error', description: 'Failed to add word', variant: 'destructive' });
    }
  };

  // Import words
  const handleImport = async () => {
    try {
      const res = await api.post('/api/english/import', {
        source: 'frequency_list',
        category_id: selectedCategory || 1,
        count: importCount,
      });
      if (res.data.success) {
        toast({ title: 'Success', description: `Imported ${res.data.data} words!` });
        setShowImport(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error importing words:', error);
      toast({ title: 'Error', description: 'Failed to import words', variant: 'destructive' });
    }
  };

  // Calculate level progress
  const levelProgress = settings ? ((settings.total_xp % 100) / 100) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            English Learning
          </h1>
          <p className="text-muted-foreground">Master English with effective techniques</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 py-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>{dashboard?.current_streak || 0} day streak</span>
            </Badge>
            <Badge variant="outline" className="gap-1 py-1.5">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Level {settings?.level || 1}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 py-1.5">
              <Zap className="h-4 w-4 text-purple-500" />
              <span>{settings?.total_xp || 0} XP</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="vocabulary" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Vocabulary</span>
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Flashcards</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="match" className="gap-2">
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Match</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achieve</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboard?.total_words || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Words</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboard?.words_learned || 0}</p>
                    <p className="text-xs text-muted-foreground">Learned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <RefreshCw className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboard?.words_to_review || 0}</p>
                    <p className="text-xs text-muted-foreground">To Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboard?.today_words_learned || 0}/{dashboard?.today_goal || 10}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Level Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Level {settings?.level || 1}</span>
                </div>
                <span className="text-sm text-muted-foreground">{settings?.total_xp || 0} XP</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {100 - (settings?.total_xp || 0) % 100} XP to Level {(settings?.level || 1) + 1}
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:border-blue-500/50 transition-colors cursor-pointer" onClick={startFlashcards}>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-blue-500/10 mb-4">
                  <Layers className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-1">Flashcards</h3>
                <p className="text-sm text-muted-foreground">Review with spaced repetition</p>
              </CardContent>
            </Card>

            <Card className="hover:border-green-500/50 transition-colors cursor-pointer" onClick={startQuiz}>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-green-500/10 mb-4">
                  <Brain className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-semibold mb-1">Take Quiz</h3>
                <p className="text-sm text-muted-foreground">Test your knowledge</p>
              </CardContent>
            </Card>

            <Card className="hover:border-purple-500/50 transition-colors cursor-pointer" onClick={startWordMatch}>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                  <Gamepad2 className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-1">Word Match</h3>
                <p className="text-sm text-muted-foreground">Match words with translations</p>
              </CardContent>
            </Card>
          </div>

          {/* Categories Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((cat) => {
                const progress = dashboard?.category_progress?.find(c => c.category_id === cat.id);
                const Icon = iconMap[cat.icon || 'book'] || BookOpen;

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: cat.color }} />
                        <span className="font-medium">{cat.name_ru}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {progress?.learned_words || 0}/{progress?.total_words || 0}
                      </span>
                    </div>
                    <Progress value={progress?.mastery_percent || 0} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Weekly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-32">
                {(dashboard?.weekly_progress || []).map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/80 rounded-t"
                      style={{
                        height: `${Math.max(8, (day.words_learned / 10) * 100)}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
                {(dashboard?.weekly_progress?.length || 0) === 0 && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No data yet. Start learning!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vocabulary Tab */}
        <TabsContent value="vocabulary" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Select
                value={selectedCategory?.toString() || 'all'}
                onValueChange={(v) => {
                  setSelectedCategory(v === 'all' ? null : parseInt(v));
                  fetchWords(v === 'all' ? null : parseInt(v));
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => fetchWords(selectedCategory)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={showImport} onOpenChange={setShowImport}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Import Words
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Common Words</DialogTitle>
                    <DialogDescription>
                      Import frequently used English words to start learning.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Number of words</Label>
                      <Slider
                        value={[importCount]}
                        onValueChange={(v) => setImportCount(v[0])}
                        max={500}
                        min={10}
                        step={10}
                        className="mt-2"
                      />
                      <p className="text-sm text-muted-foreground mt-1">{importCount} words</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleImport}>
                      <Download className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddWord} onOpenChange={setShowAddWord}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Word
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Word</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Word</Label>
                        <Input
                          value={newWord.word}
                          onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                          placeholder="hello"
                        />
                      </div>
                      <div>
                        <Label>Translation</Label>
                        <Input
                          value={newWord.translation}
                          onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })}
                          placeholder="привет"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Transcription</Label>
                        <Input
                          value={newWord.transcription}
                          onChange={(e) => setNewWord({ ...newWord, transcription: e.target.value })}
                          placeholder="[həˈləʊ]"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={newWord.category_id.toString()}
                          onValueChange={(v) => setNewWord({ ...newWord, category_id: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name_ru}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Definition</Label>
                      <Input
                        value={newWord.definition}
                        onChange={(e) => setNewWord({ ...newWord, definition: e.target.value })}
                        placeholder="Used as a greeting"
                      />
                    </div>
                    <div>
                      <Label>Examples</Label>
                      <Textarea
                        value={newWord.examples}
                        onChange={(e) => setNewWord({ ...newWord, examples: e.target.value })}
                        placeholder="Hello, how are you?"
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddWord}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Word
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Words Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => (
              <Card key={word.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{word.word}</h3>
                      {word.transcription && (
                        <p className="text-sm text-muted-foreground">{word.transcription}</p>
                      )}
                    </div>
                    <Badge variant={
                      word.progress?.status === 'mastered' ? 'default' :
                      word.progress?.status === 'learning' ? 'secondary' : 'outline'
                    }>
                      {word.progress?.status || 'new'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-primary">{word.translation}</p>
                  {word.definition && (
                    <p className="mt-1 text-sm text-muted-foreground">{word.definition}</p>
                  )}
                  {word.examples && (
                    <p className="mt-2 text-sm italic text-muted-foreground">"{word.examples}"</p>
                  )}
                  {word.progress && (
                    <div className="mt-3">
                      <Progress value={word.progress.mastery_level} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mastery: {word.progress.mastery_level}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {words.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No words yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding words or importing common vocabulary.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowImport(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Import Words
                  </Button>
                  <Button onClick={() => setShowAddWord(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Word
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards" className="space-y-6">
          {flashcards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Ready to Learn?</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a mode and start your flashcard session.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Select
                    value={flashcardMode}
                    onValueChange={(v: 'new' | 'review' | 'mixed') => setFlashcardMode(v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="new">New Words</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="lg" onClick={startFlashcards}>
                    <Play className="mr-2 h-5 w-5" />
                    Start Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Card {currentFlashcardIndex + 1} of {flashcards.length}
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setFlashcards([]); setActiveTab('dashboard'); }}>
                  <X className="mr-2 h-4 w-4" />
                  End Session
                </Button>
              </div>
              <Progress value={((currentFlashcardIndex + 1) / flashcards.length) * 100} className="h-2 mb-6" />

              {/* Flashcard */}
              <div
                className="relative h-80 cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="w-full h-full"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front */}
                  <Card className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden">
                    <h2 className="text-4xl font-bold mb-4">
                      {flashcards[currentFlashcardIndex]?.word}
                    </h2>
                    {flashcards[currentFlashcardIndex]?.transcription && (
                      <p className="text-lg text-muted-foreground">
                        {flashcards[currentFlashcardIndex]?.transcription}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-4">
                      Click to flip
                    </p>
                  </Card>

                  {/* Back */}
                  <Card
                    className="absolute inset-0 flex flex-col items-center justify-center p-8"
                    style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                  >
                    <h2 className="text-3xl font-bold text-primary mb-4">
                      {flashcards[currentFlashcardIndex]?.translation}
                    </h2>
                    {flashcards[currentFlashcardIndex]?.definition && (
                      <p className="text-muted-foreground text-center mb-2">
                        {flashcards[currentFlashcardIndex]?.definition}
                      </p>
                    )}
                    {flashcards[currentFlashcardIndex]?.examples && (
                      <p className="text-sm italic text-muted-foreground text-center">
                        "{flashcards[currentFlashcardIndex]?.examples}"
                      </p>
                    )}
                  </Card>
                </motion.div>
              </div>

              {/* Rating buttons */}
              {isFlipped && (
                <motion.div
                  className="flex items-center justify-center gap-3 mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => submitReview(1)}
                    className="gap-2"
                  >
                    <ThumbsDown className="h-5 w-5" />
                    Again
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => submitReview(3)}
                    className="gap-2"
                  >
                    <Timer className="h-5 w-5" />
                    Hard
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => submitReview(4)}
                    className="gap-2"
                  >
                    <Check className="h-5 w-5" />
                    Good
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => submitReview(5)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-5 w-5" />
                    Easy
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="space-y-6">
          {quizQuestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Test Your Knowledge</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a quiz type and challenge yourself!
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Select
                    value={quizType}
                    onValueChange={(v: 'translation' | 'word' | 'mixed') => setQuizType(v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="translation">Word → Translation</SelectItem>
                      <SelectItem value="word">Translation → Word</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="lg" onClick={startQuiz}>
                    <Play className="mr-2 h-5 w-5" />
                    Start Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Question {currentQuizIndex + 1} of {quizQuestions.length}
                </span>
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3" />
                  {quizScore} correct
                </Badge>
              </div>
              <Progress value={((currentQuizIndex + 1) / quizQuestions.length) * 100} className="h-2 mb-6" />

              {/* Question */}
              <Card className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {quizQuestions[currentQuizIndex]?.question_type === 'translation'
                      ? 'What is the translation?'
                      : 'What is the English word?'
                    }
                  </p>
                  <h2 className="text-3xl font-bold">
                    {quizQuestions[currentQuizIndex]?.question_type === 'translation'
                      ? quizQuestions[currentQuizIndex]?.word.word
                      : quizQuestions[currentQuizIndex]?.word.translation
                    }
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {quizQuestions[currentQuizIndex]?.options.map((option, idx) => {
                    const isCorrect = option === quizQuestions[currentQuizIndex]?.correct_answer;
                    const isSelected = option === selectedAnswer;

                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className={cn(
                          'h-14 text-lg justify-start px-6',
                          quizAnswered && isCorrect && 'border-green-500 bg-green-500/10',
                          quizAnswered && isSelected && !isCorrect && 'border-red-500 bg-red-500/10'
                        )}
                        onClick={() => answerQuiz(option)}
                        disabled={quizAnswered}
                      >
                        {quizAnswered && isCorrect && <Check className="mr-2 h-5 w-5 text-green-500" />}
                        {quizAnswered && isSelected && !isCorrect && <X className="mr-2 h-5 w-5 text-red-500" />}
                        {option}
                      </Button>
                    );
                  })}
                </div>

                {quizAnswered && (
                  <motion.div
                    className="mt-6 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Button size="lg" onClick={nextQuizQuestion}>
                      {currentQuizIndex < quizQuestions.length - 1 ? (
                        <>
                          Next Question
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Finish Quiz
                          <Trophy className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Word Match Tab */}
        <TabsContent value="match" className="space-y-6">
          {matchPairs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Word Match Game</h3>
                <p className="text-muted-foreground mb-4">
                  Match English words with their translations!
                </p>
                <Button size="lg" onClick={startWordMatch}>
                  <Play className="mr-2 h-5 w-5" />
                  Start Game
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3 text-green-500" />
                    Matched: {matchScore}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <X className="h-3 w-3 text-red-500" />
                    Errors: {matchErrors}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMatchPairs([]); setActiveTab('dashboard'); }}>
                  <X className="mr-2 h-4 w-4" />
                  End Game
                </Button>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {matchPairs.map((pair, idx) => (
                  <motion.button
                    key={pair.id}
                    className={cn(
                      'h-24 rounded-lg border-2 font-medium transition-all',
                      pair.matched && 'opacity-50 border-green-500 bg-green-500/10',
                      pair.selected && !pair.matched && 'border-primary bg-primary/10',
                      !pair.matched && !pair.selected && 'hover:border-primary/50'
                    )}
                    onClick={() => handleMatchSelect(idx)}
                    disabled={pair.matched}
                    whileHover={{ scale: pair.matched ? 1 : 1.05 }}
                    whileTap={{ scale: pair.matched ? 1 : 0.95 }}
                  >
                    {pair.text}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((ach) => {
              const Icon = iconMap[ach.icon || 'star'] || Star;
              const isUnlocked = ach.unlocked_at !== null;

              return (
                <Card
                  key={ach.id}
                  className={cn(
                    'transition-all',
                    isUnlocked
                      ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/5'
                      : 'opacity-60'
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      'p-3 rounded-full',
                      isUnlocked ? 'bg-yellow-500/20' : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'h-6 w-6',
                        isUnlocked ? 'text-yellow-500' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{ach.title}</h3>
                      <p className="text-sm text-muted-foreground">{ach.description}</p>
                      {isUnlocked && (
                        <p className="text-xs text-yellow-600 mt-1">
                          +{ach.xp_reward} XP
                        </p>
                      )}
                    </div>
                    {isUnlocked && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

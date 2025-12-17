import { prisma } from '../db';

export class EnglishService {
  /**
   * Update a daily statistic for English learning.
   */
  static async updateDailyStat(field: string, increment: number) {
    const today = new Date().toISOString().split('T')[0];

    // Try to find existing stat for today
    const existing = await prisma.englishDailyStats.findUnique({
      where: { date: today }
    });

    if (existing) {
      await prisma.englishDailyStats.update({
        where: { date: today },
        data: {
          [field]: {
            increment: increment
          }
        }
      });
    } else {
      // Create new daily stat
      await prisma.englishDailyStats.create({
        data: {
          date: today,
          [field]: increment
        }
      });
    }
  }

  /**
   * Add XP to the user and update level if necessary.
   */
  static async addXp(amount: number) {
    const settings = await prisma.englishSettings.findFirst();
    if (!settings) {
      // Create default settings if not exists
      await prisma.englishSettings.create({
        data: {
          total_xp: amount,
          level: 1,
          updated_at: new Date()
        }
      });
      return;
    }

    const newXp = settings.total_xp + amount;
    // Simple level calculation: level = floor(sqrt(xp / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

    await prisma.englishSettings.update({
      where: { id: settings.id },
      data: {
        total_xp: newXp,
        level: newLevel,
        updated_at: new Date()
      }
    });

    // Also update daily stat for XP
    await this.updateDailyStat('xp_earned', amount);
  }

  /**
   * Check and unlock achievements.
   */
  static async checkAchievements() {
    const stats = await prisma.englishDailyStats.aggregate({
      _sum: {
        words_learned: true,
        quizzes_completed: true,
      }
    });

    const totalLearned = stats._sum.words_learned || 0;
    const totalQuizzes = stats._sum.quizzes_completed || 0;

    const achievements = [
      { type: 'first_word', title: 'First Steps', desc: 'Learn your first word', condition: totalLearned >= 1, xp: 50 },
      { type: 'learned_10', title: 'Getting Started', desc: 'Learn 10 words', condition: totalLearned >= 10, xp: 100 },
      { type: 'learned_100', title: 'Word Master', desc: 'Learn 100 words', condition: totalLearned >= 100, xp: 500 },
      { type: 'quiz_master', title: 'Quiz Master', desc: 'Complete 10 quizzes', condition: totalQuizzes >= 10, xp: 200 },
    ];

    for (const ach of achievements) {
      if (ach.condition) {
        const existing = await prisma.englishAchievement.findUnique({
          where: { achievement_type: ach.type }
        });

        if (existing && !existing.unlocked_at) {
          await prisma.englishAchievement.update({
            where: { id: existing.id },
            data: { unlocked_at: new Date() }
          });
          await this.addXp(ach.xp);
        } else if (!existing) {
          await prisma.englishAchievement.create({
            data: {
              achievement_type: ach.type,
              title: ach.title,
              description: ach.desc,
              xp_reward: ach.xp,
              unlocked_at: new Date()
            }
          });
          await this.addXp(ach.xp);
        }
      }
    }
  }
}

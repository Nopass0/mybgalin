'use client';

import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function HHIntegration() {
  const { searchStatus, getHHAuthUrl } = useJobs();
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const authUrl = await getHHAuthUrl();
      window.open(authUrl, '_blank');
      toast.success('Откройте окно для авторизации');
    } catch (error) {
      toast.error('Ошибка получения ссылки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Интеграция с HeadHunter
            {searchStatus?.is_authorized ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardTitle>
          <CardDescription>
            {searchStatus?.is_authorized
              ? 'Ваш аккаунт HH.ru подключен'
              : 'Подключите аккаунт HH.ru для автоматического поиска и отклика на вакансии'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!searchStatus?.is_authorized && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted p-4">
                <h4 className="font-semibold mb-2">Как подключить HH.ru:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Нажмите кнопку "Подключить HH.ru"</li>
                  <li>Авторизуйтесь на сайте HeadHunter</li>
                  <li>Разрешите приложению доступ к вашему аккаунту</li>
                  <li>После авторизации вернитесь на эту страницу</li>
                </ol>
              </div>
              <Button onClick={handleAuthorize} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Подключить HH.ru
                  </>
                )}
              </Button>
            </div>
          )}

          {searchStatus?.is_authorized && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                Аккаунт HH.ru успешно подключен. Теперь вы можете настроить автоматический поиск вакансий.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>О функционале</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>После подключения HH.ru бот может:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Автоматически искать подходящие вакансии по заданным критериям</li>
            <li>Генерировать персонализированные сопроводительные письма с помощью AI</li>
            <li>Отправлять отклики на вакансии</li>
            <li>Отслеживать статус откликов</li>
            <li>Уведомлять вас о новых приглашениях в Telegram</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

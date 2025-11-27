"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function HHCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"success" | "error">("error");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (success === "true") {
      setStatus("success");
      setMessage("Авторизация HH.ru прошла успешно! Токен сохранен.");
      return;
    }

    if (error) {
      setStatus("error");
      const errorMessages: Record<string, string> = {
        no_code: "Код авторизации не получен",
        token_exchange: "Не удалось обменять код на токен",
        db_error: "Ошибка при сохранении токена в базу данных",
      };
      setMessage(
        errorMessages[error] || errorDescription || "Ошибка авторизации HH.ru",
      );
      return;
    }

    // If no params, show error
    setStatus("error");
    setMessage("Неверные параметры авторизации");
  }, [searchParams]);

  const handleGoToAdmin = () => {
    router.push("/admin");
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "success" && (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === "success" && "Успешно!"}
            {status === "error" && "Ошибка"}
          </CardTitle>
          <CardDescription>
            {status === "success" && "Вы успешно авторизовались в HH.ru"}
            {status === "error" && "Что-то пошло не так при авторизации"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">{message}</p>

          {status === "success" && (
            <div className="space-y-2">
              <Button onClick={handleGoToAdmin} className="w-full">
                Перейти в админку
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Закрыть страницу
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <Button onClick={handleGoToAdmin} className="w-full">
                Вернуться в админку
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Закрыть страницу
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HHCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <HHCallbackContent />
    </Suspense>
  );
}

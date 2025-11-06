"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    error,
    requestOtp,
    verifyOtp,
    initialize,
  } = useAuth();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // Redirect to portfolio if authenticated
    if (isAuthenticated) {
      router.push("/admin/portfolio");
    }
  }, [isAuthenticated, router]);

  const handleRequestOtp = async () => {
    setRequesting(true);
    try {
      await requestOtp();
      toast.success("Код отправлен в Telegram");
      setStep("verify");
    } catch (error: any) {
      toast.error(error.message || "Не удалось отправить код");
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error("Введите 6-значный код");
      return;
    }

    try {
      const success = await verifyOtp(code);
      if (success) {
        toast.success("Вход выполнен успешно");
      } else {
        toast.error("Неверный код");
      }
    } catch (error: any) {
      toast.error(error.message || "Ошибка авторизации");
    }
  };

  // Show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Вход в админку</CardTitle>
            <CardDescription>
              {step === "request"
                ? "Получите код подтверждения в Telegram"
                : "Введите код из Telegram сообщения"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "request" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Нажмите кнопку ниже, чтобы получить одноразовый код в Telegram
                </p>
                <Button
                  onClick={handleRequestOtp}
                  disabled={requesting}
                  className="w-full"
                  size="lg"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить код"
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Код подтверждения</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("request")}
                  className="w-full"
                >
                  Отправить код снова
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

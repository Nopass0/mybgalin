"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Store, Lock, User, Loader2, ArrowRight } from "lucide-react";
import { t2ApiService } from "@/lib/t2-api";

export default function T2LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("t2_auth_token");
    if (token) {
      router.push("/t2/catalog");
    }
  }, [router]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");

    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every((d) => d) && newCode.join("").length === 5) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length === 5) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeStr?: string) => {
    const fullCode = codeStr || code.join("");
    if (fullCode.length !== 5) {
      setError("Введите 5-значный код");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await t2ApiService.login(fullCode, name || undefined);
      localStorage.setItem("t2_auth_token", result.token);
      localStorage.setItem("t2_employee", JSON.stringify(result.employee));
      if (result.employee.stores.length > 0) {
        localStorage.setItem("t2_current_store", result.employee.stores[0].id.toString());
      }
      router.push("/t2/catalog");
    } catch (e: any) {
      if (e.message === "Неверный код доступа") {
        setError("Неверный код доступа");
      } else {
        setError("Ошибка подключения к серверу");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(0,188,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,188,212,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <Store className="w-12 h-12 text-black" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl bg-cyan-500/30 blur-xl"
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent"
        >
          T2 Sales
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 text-center mb-8"
        >
          Система продаж для точек Tele2
        </motion.p>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111]/80 backdrop-blur-xl rounded-3xl p-8 border border-cyan-500/20 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="font-semibold">Вход в систему</h2>
              <p className="text-sm text-gray-500">Введите код доступа</p>
            </div>
          </div>

          {/* Code Input */}
          <div className="flex justify-center gap-3 mb-6">
            {code.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-black/50
                  focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20
                  transition-all ${
                    digit
                      ? "border-cyan-500/50 text-cyan-400"
                      : "border-gray-700 text-white"
                  } ${error ? "border-red-500 shake" : ""}`}
              />
            ))}
          </div>

          {/* Name Input (optional) */}
          {showNameInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30 border border-gray-700">
                <User className="w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Ваше имя (необязательно)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
                />
              </div>
            </motion.div>
          )}

          {!showNameInput && (
            <button
              onClick={() => setShowNameInput(true)}
              className="w-full text-center text-sm text-gray-500 hover:text-cyan-400 transition-colors mb-6"
            >
              Первый вход? Указать имя
            </button>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            onClick={() => handleSubmit()}
            disabled={isLoading || code.some((d) => !d)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold
              flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
              hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Войти
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-600 text-sm mt-6"
        >
          Получите код у администратора точки
        </motion.p>
      </motion.div>

      <style jsx global>{`
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

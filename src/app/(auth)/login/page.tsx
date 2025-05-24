"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("Attempting login with:", { email, password });

    try {
      console.log("Calling signIn...");
      await signIn(email, password);
      console.log("SignIn successful, redirecting to dashboard");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error details:", err);

      // Более понятные сообщения об ошибках
      if (err.message?.includes("Invalid login credentials")) {
        setError("Неверный email или пароль. Пожалуйста, проверьте правильность введенных данных.");
      } else if (err.message?.includes("Email not confirmed")) {
        setError("Необходимо подтвердить email адрес. Проверьте почту и перейдите по ссылке в письме.");
      } else if (err.message?.includes("Too many requests")) {
        setError("Слишком много попыток входа. Попробуйте через несколько минут.");
      } else if (err.message?.includes("User not found")) {
        setError("Пользователь с таким email не найден. Проверьте email или зарегистрируйтесь.");
      } else {
        setError("Ошибка при входе в систему. Пожалуйста, попробуйте снова.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход в ClassVerse</CardTitle>
          <CardDescription>
            Введите свои данные для входа в систему
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@school.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Пароль
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
            <div className="text-center text-sm">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Зарегистрироваться
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

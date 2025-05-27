"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BookOpen,
  Users,
  Image,
  LogOut,
  Menu,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Проверка аутентификации
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Редирект будет выполнен в useEffect
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Мобильная навигация */}
      <div className="md:hidden p-4 border-b border-border flex justify-between items-center">
        <h1 className="text-xl font-bold">ClassVerse</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={24} />
          </Button>
        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-b border-border">
          <nav className="px-3 py-2">
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive("/dashboard")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={18} />
                  <span>Дашборд</span>
                </Link>
              </li>
              <li>
                <Link href="/chats"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive("/chats")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare size={18} />
                  <span>Чаты</span>
                </Link>
              </li>
              <li>
                <Link href="/schedule"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive("/schedule")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar size={18} />
                  <span>Расписание</span>
                </Link>
              </li>
              <li>
                <Link href="/homework"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive("/homework")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BookOpen size={18} />
                  <span>Домашние задания</span>
                </Link>
              </li>
              <li>
                <Link href="/settings"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive("/settings")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  <span>Настройки</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Боковая навигация */}
      <aside className="w-64 bg-card border-r border-border hidden md:block">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ClassVerse</h1>
          <ThemeToggle />
        </div>

        <nav className="px-3 py-2">
          <ul className="space-y-1">
            <li>
              <Link href="/dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive("/dashboard")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <LayoutDashboard size={18} />
                <span>Дашборд</span>
              </Link>
            </li>
            <li>
              <Link href="/chats"
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive("/chats")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <MessageSquare size={18} />
                <span>Чаты</span>
              </Link>
            </li>
            <li>
              <Link href="/schedule"
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive("/schedule")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <Calendar size={18} />
                <span>Расписание</span>
              </Link>
            </li>
            <li>
              <Link href="/homework"
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive("/homework")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <BookOpen size={18} />
                <span>Домашние задания</span>
              </Link>
            </li>
            <li>
              <Link href="/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  isActive("/settings")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <Settings size={18} />
                <span>Настройки</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <Toaster />
    </div>
  );
}

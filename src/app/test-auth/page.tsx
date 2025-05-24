"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("Checking auth status...");
        
        // Проверяем текущую сессию
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log("Session data:", sessionData);
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          return;
        }
        
        setSession(sessionData.session);
        
        // Получаем данные пользователя
        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          console.log("User data:", userData);
          
          if (userError) {
            console.error("User error:", userError);
            setError(userError.message);
            return;
          }
          
          setUser(userData.user);
        }
      } catch (err: any) {
        console.error("Auth check error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
    
    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event, newSession);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(err.message);
    }
  };
  
  const handleTestLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });
      
      if (error) throw error;
      console.log("Test login successful:", data);
    } catch (err: any) {
      console.error("Test login error:", err);
      setError(err.message);
    }
  };
  
  const handleTestSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: "test@example.com",
        password: "password123",
        options: {
          data: {
            name: "Test User",
          },
        },
      });
      
      if (error) throw error;
      console.log("Test signup successful:", data);
    } catch (err: any) {
      console.error("Test signup error:", err);
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Тестирование аутентификации</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Загрузка...</p>
          ) : error ? (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md mb-4">
              <p>Ошибка: {error}</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Статус сессии:</h3>
                <pre className="bg-secondary p-3 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">Данные пользователя:</h3>
                <pre className="bg-secondary p-3 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </>
          )}
          
          <div className="flex gap-4 mt-4">
            <Button onClick={handleTestLogin}>
              Тестовый вход
            </Button>
            <Button onClick={handleTestSignUp}>
              Тестовая регистрация
            </Button>
            {user && (
              <Button variant="destructive" onClick={handleSignOut}>
                Выйти
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

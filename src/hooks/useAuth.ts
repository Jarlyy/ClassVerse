"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Получаем текущего пользователя
    const getUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Функция для входа по email/password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log("useAuth.signIn called with:", email);

    try {
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("Supabase key length:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Supabase auth response:", { data, error });

      if (error) {
        console.error("Supabase auth error:", error);
        throw error;
      }

      console.log("Sign in successful, user:", data.user);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Функция для регистрации
  const signUp = async (email: string, password: string, metadata: { name: string }) => {
    setLoading(true);
    console.log("useAuth.signUp called with:", email, metadata);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      console.log("Supabase signUp response:", { data, error });

      if (error) {
        console.error("Supabase signUp error:", error);
        throw error;
      }

      console.log("Sign up successful, user:", data.user);
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Функция для выхода
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}

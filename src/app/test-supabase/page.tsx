"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Проверка...');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('Подключение к Supabase...');
      
      // Проверяем базовое подключение
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        setConnectionStatus(`Ошибка подключения: ${error.message}`);
        setError(error.message);
      } else {
        setConnectionStatus('✅ Подключение к Supabase успешно');
      }
    } catch (err: any) {
      setConnectionStatus(`❌ Ошибка: ${err.message}`);
      setError(err.message);
    }
  };

  const testProfilesQuery = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Testing profiles query...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      console.log('Profiles query result:', { data, error });
      
      if (error) {
        setError(`Ошибка запроса профилей: ${error.message}`);
      } else {
        setProfiles(data || []);
        setError('');
      }
    } catch (err: any) {
      console.error('Error testing profiles:', err);
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSearchFunction = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Testing search function...');
      
      const { data, error } = await supabase.rpc('search_users_for_chat', {
        search_term: 'test'
      });
      
      console.log('Search function result:', { data, error });
      
      if (error) {
        setError(`Ошибка функции поиска: ${error.message}`);
      } else {
        setError('✅ Функция поиска работает');
      }
    } catch (err: any) {
      console.error('Error testing search function:', err);
      setError(`Ошибка функции поиска: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Testing auth...');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      console.log('Auth result:', { user, error });
      
      if (error) {
        setError(`Ошибка аутентификации: ${error.message}`);
      } else if (user) {
        setError(`✅ Пользователь аутентифицирован: ${user.email}`);
      } else {
        setError('❌ Пользователь не аутентифицирован');
      }
    } catch (err: any) {
      console.error('Error testing auth:', err);
      setError(`Ошибка аутентификации: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Тест подключения к Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Статус подключения:</strong> {connectionStatus}
          </div>
          
          <div className="space-x-2">
            <Button onClick={testConnection} disabled={loading}>
              Проверить подключение
            </Button>
            <Button onClick={testAuth} disabled={loading}>
              Проверить аутентификацию
            </Button>
            <Button onClick={testProfilesQuery} disabled={loading}>
              Проверить профили
            </Button>
            <Button onClick={testSearchFunction} disabled={loading}>
              Проверить поиск
            </Button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
              {error}
            </div>
          )}
          
          {profiles.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Найденные профили:</h3>
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div key={profile.id} className="p-2 border rounded">
                    <div><strong>ID:</strong> {profile.id}</div>
                    <div><strong>Имя:</strong> {profile.name}</div>
                    <div><strong>Email:</strong> {profile.email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><strong>Anon Key Length:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

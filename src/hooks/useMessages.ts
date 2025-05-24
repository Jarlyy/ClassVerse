"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Получение сообщений для канала
  const fetchMessages = async () => {
    if (!channelId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Получаем настройки пользователя для этого чата (временно отключено)
      // const { data: settings } = await supabase
      //   .from('user_chat_settings')
      //   .select('cleared_at')
      //   .eq('user_id', user.id)
      //   .eq('channel_id', channelId)
      //   .single();

      // Строим запрос сообщений
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Отправка нового сообщения
  const sendMessage = async (content: string) => {
    if (!user || !channelId) throw new Error('Пользователь не аутентифицирован или канал не выбран');

    try {
      console.log('Sending message with user ID:', user.id, 'to channel:', channelId);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Добавляем новое сообщение в список
      setMessages(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('Error sending message:', err);

      // Более понятные сообщения об ошибках
      if (err.message?.includes('row-level security')) {
        throw new Error('Недостаточно прав для отправки сообщения.');
      } else {
        throw new Error(err.message || 'Ошибка при отправке сообщения');
      }
    }
  };

  // Удаление сообщения (только автор может удалить)
  const deleteMessage = async (messageId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id); // Только автор может удалить

      if (error) throw error;

      // Удаляем сообщение из списка
      setMessages(prev => prev.filter(message => message.id !== messageId));
    } catch (err: any) {
      console.error('Error deleting message:', err);
      throw err;
    }
  };

  // Очистка истории чата (только для текущего пользователя)
  const clearChatHistory = async () => {
    if (!user || !channelId) throw new Error('Пользователь не аутентифицирован или канал не выбран');

    try {
      // Временно просто очищаем сообщения локально
      // TODO: Реализовать через user_chat_settings после применения миграции
      setMessages([]);

      // Показываем уведомление
      alert('История чата очищена (только для вас)');
    } catch (err: any) {
      console.error('Error clearing chat history:', err);
      throw new Error(err.message || 'Ошибка при очистке истории чата');
    }
  };

  // Подписка на новые сообщения в реальном времени
  useEffect(() => {
    if (!channelId) return;

    fetchMessages();

    // Подписываемся на новые сообщения
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Получаем полные данные сообщения с профилем
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (
                id,
                name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            // Добавляем новое сообщение только если оно не от текущего пользователя
            // (свои сообщения мы уже добавили при отправке)
            if (data.user_id !== user?.id) {
              setMessages(prev => [...prev, data]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages(prev => prev.filter(message => message.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, user?.id]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    clearChatHistory,
    refetch: fetchMessages,
  };
}

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface Channel {
  id: string;
  name: string;
  subject: string;
  description?: string;
  admin_id: string;
  is_private: boolean;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  participants?: {
    id: string;
    name: string;
    email: string;
  }[];
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Получение списка чатов
  const fetchChannels = async () => {
    try {
      setLoading(true);

      console.log('Fetching channels for user:', user?.id);

      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw channels data:', channelsData);
      console.log('Channels count:', channelsData?.length || 0);

      // Получаем настройки пользователя для фильтрации скрытых чатов (временно отключено)
      // const { data: settingsData } = await supabase
      //   .from('user_chat_settings')
      //   .select('channel_id, hidden')
      //   .eq('user_id', user?.id || '')
      //   .eq('hidden', true);

      // Фильтруем скрытые чаты (временно показываем все)
      // const hiddenChannelIds = new Set(settingsData?.map(s => s.channel_id) || []);
      const visibleChannels = channelsData || [];

      // Для личных чатов получаем информацию об участниках
      const channelsWithParticipants = await Promise.all(
        visibleChannels.map(async (channel) => {
          if (channel.is_private && channel.participant_ids?.length > 0) {
            const { data: participants, error: participantsError } = await supabase
              .from('profiles')
              .select('id, name, email')
              .in('id', channel.participant_ids);

            if (!participantsError) {
              return { ...channel, participants };
            }
          }
          return channel;
        })
      );

      setChannels(channelsWithParticipants);
    } catch (err: any) {
      console.error('Error fetching channels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Создание нового чата
  const createChannel = async (name: string, subject: string, description?: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      console.log('Creating channel with user ID:', user.id);

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          subject,
          description,
          admin_id: user.id,
          is_private: false,
          participant_ids: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Добавляем новый чат в список
      setChannels(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating channel:', err);

      // Более понятные сообщения об ошибках
      if (err.message?.includes('row-level security')) {
        throw new Error('Недостаточно прав для создания чата. Проверьте настройки безопасности.');
      } else if (err.message?.includes('duplicate key')) {
        throw new Error('Чат с таким названием уже существует.');
      } else {
        throw new Error(err.message || 'Ошибка при создании чата');
      }
    }
  };

  // Создание личного чата
  const createPrivateChat = async (otherUserId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      console.log('Creating private chat with user:', otherUserId);

      const { data, error } = await supabase.rpc('create_private_chat', {
        other_user_id: otherUserId
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Обновляем список чатов
      await fetchChannels();
      return data;
    } catch (err: any) {
      console.error('Error creating private chat:', err);

      if (err.message?.includes('Cannot create chat with yourself')) {
        throw new Error('Нельзя создать чат с самим собой');
      } else if (err.message?.includes('row-level security')) {
        throw new Error('Недостаточно прав для создания личного чата');
      } else {
        throw new Error(err.message || 'Ошибка при создании личного чата');
      }
    }
  };

  // Удаление чата (только для админа)
  const deleteChannel = async (channelId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)
        .eq('admin_id', user.id); // Только админ может удалить

      if (error) throw error;

      // Удаляем чат из списка
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
    } catch (err: any) {
      console.error('Error deleting channel:', err);
      throw err;
    }
  };

  // Удаление личного чата (для участников)
  const deletePrivateChat = async (channelId: string, deleteForBoth: boolean = false) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      if (deleteForBoth) {
        // Удаляем чат полностью
        const { error } = await supabase
          .from('channels')
          .delete()
          .eq('id', channelId);

        if (error) throw error;
      } else {
        // Временно просто удаляем чат локально
        // TODO: Реализовать скрытие через user_chat_settings после применения миграции
        console.log('Hiding chat for user only (temporary implementation)');
      }

      // Удаляем чат из списка локально
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
    } catch (err: any) {
      console.error('Error deleting private chat:', err);
      throw new Error(err.message || 'Ошибка при удалении чата');
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return {
    channels,
    loading,
    error,
    createChannel,
    createPrivateChat,
    deleteChannel,
    deletePrivateChat,
    refetch: fetchChannels,
  };
}

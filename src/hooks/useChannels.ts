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

  // Получение списка каналов
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

      // Для личных чатов получаем информацию об участниках
      const channelsWithParticipants = await Promise.all(
        (channelsData || []).map(async (channel) => {
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

  // Создание нового канала
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

      // Добавляем новый канал в список
      setChannels(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating channel:', err);

      // Более понятные сообщения об ошибках
      if (err.message?.includes('row-level security')) {
        throw new Error('Недостаточно прав для создания канала. Проверьте настройки безопасности.');
      } else if (err.message?.includes('duplicate key')) {
        throw new Error('Канал с таким названием уже существует.');
      } else {
        throw new Error(err.message || 'Ошибка при создании канала');
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

      // Обновляем список каналов
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

  // Удаление канала (только для админа)
  const deleteChannel = async (channelId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)
        .eq('admin_id', user.id); // Только админ может удалить

      if (error) throw error;

      // Удаляем канал из списка
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
    } catch (err: any) {
      console.error('Error deleting channel:', err);
      throw err;
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
    refetch: fetchChannels,
  };
}

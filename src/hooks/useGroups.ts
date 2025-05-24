"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface GroupMember {
  user_id: string;
  user_name: string;
  user_email: string;
  is_admin: boolean;
}

export interface UserForGroup {
  user_id: string;
  user_name: string;
  user_email: string;
  is_member: boolean;
}

export function useGroups() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Создание группы
  const createGroup = async (name: string, description?: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('create_group_chat', {
        group_name: name,
        group_description: description || null
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error creating group:', err);
      throw new Error(err.message || 'Ошибка при создании группы');
    } finally {
      setLoading(false);
    }
  };

  // Получение участников группы
  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error } = await supabase.rpc('get_group_members', {
        group_id: groupId
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching group members:', err);
      throw new Error(err.message || 'Ошибка при получении участников группы');
    }
  };

  // Получение всех пользователей для добавления в группу (упрощенная версия)
  const getAvailableUsers = async (): Promise<UserForGroup[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .neq('id', user?.id); // Исключаем текущего пользователя

      if (error) throw error;

      return (data || []).map(profile => ({
        user_id: profile.id,
        user_name: profile.name || profile.email || 'Неизвестный пользователь',
        user_email: profile.email,
        is_member: false // Будет определяться отдельно
      }));
    } catch (err: any) {
      console.error('Error getting available users:', err);
      throw new Error(err.message || 'Ошибка при получении пользователей');
    }
  };

  // Добавление участника в группу
  const addGroupMember = async (groupId: string, userId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('add_group_member', {
        group_id: groupId,
        new_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error adding group member:', err);

      if (err.message?.includes('permission') || err.message?.includes('Access denied')) {
        throw new Error('У вас нет прав для добавления участников в эту группу');
      } else if (err.message?.includes('not found')) {
        throw new Error('Пользователь не найден');
      } else if (err.message?.includes('already a member')) {
        throw new Error('Пользователь уже является участником группы');
      } else if (err.message?.includes('contacts')) {
        throw new Error('Вы можете добавлять только пользователей из ваших контактов');
      } else {
        throw new Error(err.message || 'Ошибка при добавлении участника');
      }
    } finally {
      setLoading(false);
    }
  };

  // Удаление участника из группы
  const removeGroupMember = async (groupId: string, userId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('remove_group_member', {
        group_id: groupId,
        remove_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error removing group member:', err);

      if (err.message?.includes('permission') || err.message?.includes('Access denied')) {
        throw new Error('У вас нет прав для удаления участников из этой группы');
      } else if (err.message?.includes('cannot remove yourself')) {
        throw new Error('Вы не можете удалить себя из группы');
      } else if (err.message?.includes('cannot remove another admin')) {
        throw new Error('Нельзя удалить другого администратора группы');
      } else if (err.message?.includes('not a member')) {
        throw new Error('Пользователь не является участником группы');
      } else {
        throw new Error(err.message || 'Ошибка при удалении участника');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createGroup,
    getGroupMembers,
    getAvailableUsers,
    addGroupMember,
    removeGroupMember,
  };
}

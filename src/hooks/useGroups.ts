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
      const { data, error } = await supabase.rpc('create_group', {
        group_name: name,
        group_description: description || ''
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

  // Поиск контактов для добавления в группу
  const searchContactsForGroup = async (groupId: string, searchTerm: string): Promise<UserForGroup[]> => {
    try {
      const { data, error } = await supabase.rpc('search_contacts_for_group', {
        group_id: groupId,
        search_term: searchTerm
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error searching contacts for group:', err);
      throw new Error(err.message || 'Ошибка при поиске контактов');
    }
  };

  // Получение всех контактов для добавления в группу
  const getContactsForGroup = async (groupId: string): Promise<UserForGroup[]> => {
    try {
      const { data, error } = await supabase.rpc('get_contacts_for_group', {
        group_id: groupId
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error getting contacts for group:', err);
      throw new Error(err.message || 'Ошибка при получении контактов');
    }
  };

  // Добавление участника в группу
  const addGroupMember = async (groupId: string, userId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('add_group_member', {
        group_id: groupId,
        user_id_to_add: userId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error adding group member:', err);

      if (err.message?.includes('permission')) {
        throw new Error('У вас нет прав для добавления участников в эту группу');
      } else if (err.message?.includes('does not exist')) {
        throw new Error('Пользователь не найден');
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
        user_id_to_remove: userId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error removing group member:', err);

      if (err.message?.includes('permission')) {
        throw new Error('У вас нет прав для удаления участников из этой группы');
      } else if (err.message?.includes('Cannot remove group admin')) {
        throw new Error('Нельзя удалить администратора группы');
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
    searchContactsForGroup,
    getContactsForGroup,
    addGroupMember,
    removeGroupMember,
  };
}

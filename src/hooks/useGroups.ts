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
  const createGroup = async (name: string, description?: string, hasSubgroups: boolean = false) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          subject: 'Группа',
          description,
          is_private: false,
          has_subgroups: hasSubgroups,
          admin_id: user.id,
          participant_ids: [user.id],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error creating group:', err);
      throw new Error(err.message || 'Ошибка при создании группы');
    } finally {
      setLoading(false);
    }
  };

  // Создание группы класса (для администратора)
  const createClassGroup = async (className: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);

      // Проверяем, что пользователь является администратором
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role !== 'admin') {
        throw new Error('Только администратор может создавать группы классов');
      }

      // Проверяем, не существует ли уже группа класса
      const { data: existingGroup, error: searchError } = await supabase
        .from('channels')
        .select('id')
        .eq('name', className)
        .eq('is_class_group', true)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingGroup) {
        return existingGroup.id;
      }

      // Получаем всех учеников этого класса
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('class_name', className);

      if (studentsError) throw studentsError;

      const participantIds = [user.id, ...(students?.map(s => s.id) || [])];

      // Создаем группу класса
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: className,
          subject: 'Основная группа класса',
          description: `Основная группа для класса ${className} с возможностью создания подгрупп`,
          is_private: false,
          has_subgroups: true,
          is_class_group: true,
          admin_id: user.id,
          participant_ids: participantIds,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (err: any) {
      console.error('Error creating class group:', err);
      throw new Error(err.message || 'Ошибка при создании группы класса');
    } finally {
      setLoading(false);
    }
  };

  // Создание подгруппы
  const createSubgroup = async (parentGroupId: string, name: string, description?: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setLoading(true);

      // Проверяем, что родительская группа поддерживает подгруппы и пользователь является её создателем
      const { data: parentGroup, error: parentError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', parentGroupId)
        .single();

      if (parentError) throw parentError;

      if (!parentGroup.has_subgroups) {
        throw new Error('Эта группа не поддерживает создание подгрупп');
      }

      if (parentGroup.admin_id !== user.id) {
        throw new Error('Только создатель группы может создавать подгруппы');
      }

      // Создаем подгруппу
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          subject: 'Подгруппа',
          description,
          is_private: false,
          has_subgroups: false,
          parent_channel_id: parentGroupId,
          admin_id: user.id,
          participant_ids: [user.id],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error creating subgroup:', err);
      throw new Error(err.message || 'Ошибка при создании подгруппы');
    } finally {
      setLoading(false);
    }
  };

  // Получение участников группы
  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      // Сначала пробуем использовать функцию get_group_members
      try {
        const { data, error } = await supabase.rpc('get_group_members', {
          group_id: groupId
        });

        if (error) throw error;

        return (data || []).map((member: any) => ({
          user_id: member.user_id,
          user_name: member.user_name,
          user_email: member.user_email,
          is_admin: member.is_admin
        }));
      } catch (rpcError: any) {
        console.log('RPC function failed, trying direct query:', rpcError.message);

        // Если RPC функция не работает, используем прямой запрос
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('participant_ids, admin_id')
          .eq('id', groupId)
          .single();

        if (channelError) throw channelError;

        if (!channel.participant_ids || channel.participant_ids.length === 0) {
          return [];
        }

        // Получаем информацию о пользователях
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', channel.participant_ids);

        if (profilesError) throw profilesError;

        return (profiles || []).map((profile: any) => ({
          user_id: profile.id,
          user_name: profile.name || profile.email || 'Неизвестный пользователь',
          user_email: profile.email,
          is_admin: profile.id === channel.admin_id
        }));
      }
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

      // Сначала пробуем использовать RPC функцию
      try {
        const { data, error } = await supabase.rpc('add_group_member', {
          group_id: groupId,
          new_user_id: userId
        });

        if (error) throw error;
        return data;
      } catch (rpcError: any) {
        console.log('RPC function failed, trying direct update:', rpcError.message);

        // Если RPC не работает, используем прямое обновление
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('participant_ids, admin_id')
          .eq('id', groupId)
          .single();

        if (channelError) throw channelError;

        // Проверяем права доступа
        if (channel.admin_id !== user.id && !channel.participant_ids?.includes(user.id)) {
          throw new Error('У вас нет прав для добавления участников в эту группу');
        }

        // Проверяем, что пользователь еще не является участником
        if (channel.participant_ids?.includes(userId)) {
          throw new Error('Пользователь уже является участником группы');
        }

        // Добавляем пользователя
        const newParticipantIds = [...(channel.participant_ids || []), userId];
        const { error: updateError } = await supabase
          .from('channels')
          .update({ participant_ids: newParticipantIds })
          .eq('id', groupId);

        if (updateError) throw updateError;
        return true;
      }
    } catch (err: any) {
      console.error('Error adding group member:', err);

      if (err.message?.includes('permission') || err.message?.includes('Access denied') || err.message?.includes('Only channel admin')) {
        throw new Error('У вас нет прав для добавления участников в эту группу');
      } else if (err.message?.includes('not found')) {
        throw new Error('Пользователь не найден');
      } else if (err.message?.includes('already a member')) {
        throw new Error('Пользователь уже является участником группы');
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

      // Сначала пробуем использовать RPC функцию
      try {
        const { data, error } = await supabase.rpc('remove_group_member', {
          group_id: groupId,
          user_id_to_remove: userId
        });

        if (error) throw error;
        return data;
      } catch (rpcError: any) {
        // RPC функция не существует, используем прямое обновление

        // Если RPC не работает, используем прямое обновление
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('participant_ids, admin_id')
          .eq('id', groupId)
          .single();

        if (channelError) throw channelError;

        // Проверяем права доступа
        // Администратор может удалить любого участника, обычный участник может удалить только себя
        if (channel.admin_id !== user.id && userId !== user.id) {
          throw new Error('У вас нет прав для удаления участников из этой группы');
        }

        // Если администратор покидает группу, нужно либо удалить группу, либо передать права
        if (userId === channel.admin_id && userId === user.id) {
          // Если в группе есть другие участники, передаем права первому участнику
          const otherParticipants = channel.participant_ids?.filter(id => id !== userId) || [];

          if (otherParticipants.length > 0) {
            // Передаем права администратора первому участнику
            const newAdminId = otherParticipants[0];
            const { error: updateError } = await supabase
              .from('channels')
              .update({
                admin_id: newAdminId,
                participant_ids: otherParticipants
              })
              .eq('id', groupId);

            if (updateError) throw updateError;
            return true;
          } else {
            // Если других участников нет, удаляем группу
            const { error: deleteError } = await supabase
              .from('channels')
              .delete()
              .eq('id', groupId);

            if (deleteError) throw deleteError;
            return true;
          }
        }

        // Проверяем, что пользователь является участником
        if (!channel.participant_ids?.includes(userId)) {
          throw new Error('Пользователь не является участником группы');
        }

        // Удаляем пользователя
        const newParticipantIds = channel.participant_ids.filter(id => id !== userId);

        const { error: updateError } = await supabase
          .from('channels')
          .update({ participant_ids: newParticipantIds })
          .eq('id', groupId);

        if (updateError) throw updateError;

        return true;
      }
    } catch (err: any) {
      console.error('Error removing group member:', err);

      if (err.message?.includes('permission') || err.message?.includes('Access denied') || err.message?.includes('Only channel admin')) {
        throw new Error('У вас нет прав для удаления участников из этой группы');
      } else if (err.message?.includes('Cannot remove channel admin')) {
        throw new Error('Нельзя удалить администратора группы');
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
    createClassGroup,
    createSubgroup,
    getGroupMembers,
    getAvailableUsers,
    addGroupMember,
    removeGroupMember,
  };
}

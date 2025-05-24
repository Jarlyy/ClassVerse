"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface Contact {
  id: string;
  name: string;
  email: string;
  class_name: string;
  role: string;
  added_at: string;
  has_chat: boolean;
}

export interface UserToAdd {
  id: string;
  name: string;
  email: string;
  class_name: string;
  role: string;
  is_contact: boolean;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Получение списка контактов
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_contacts');

      if (error) throw error;

      // Преобразуем данные к нужному формату
      const formattedContacts = (data || []).map((contact: any) => ({
        id: contact.contact_id,
        name: contact.contact_name,
        email: contact.contact_email,
        class_name: contact.contact_class_name || '',
        role: contact.contact_role || 'student',
        added_at: contact.added_at,
        has_chat: contact.has_chat
      }));

      setContacts(formattedContacts);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Поиск пользователей для добавления в контакты
  const searchUsers = async (searchTerm: string): Promise<UserToAdd[]> => {
    try {
      const { data, error } = await supabase.rpc('search_users_to_add_contact', {
        search_term: searchTerm
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error searching users:', err);
      throw err;
    }
  };

  // Добавление контакта
  const addContact = async (userId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { data, error } = await supabase.rpc('add_contact', {
        target_user_id: userId
      });

      if (error) throw error;

      // Обновляем список контактов
      await fetchContacts();
      return data;
    } catch (err: any) {
      console.error('Error adding contact:', err);

      if (err.message?.includes('Cannot add yourself')) {
        throw new Error('Нельзя добавить себя в контакты');
      } else if (err.message?.includes('User does not exist')) {
        throw new Error('Пользователь не найден');
      } else {
        throw new Error(err.message || 'Ошибка при добавлении контакта');
      }
    }
  };

  // Удаление контакта
  const removeContact = async (userId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { data, error } = await supabase.rpc('remove_contact', {
        target_user_id: userId
      });

      if (error) throw error;

      // Обновляем список контактов
      await fetchContacts();
      return data;
    } catch (err: any) {
      console.error('Error removing contact:', err);
      throw new Error(err.message || 'Ошибка при удалении контакта');
    }
  };

  // Создание чата с контактом
  const createChatWithContact = async (contactId: string) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      const { data, error } = await supabase.rpc('create_private_chat_with_contact', {
        target_user_id: contactId
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error creating chat with contact:', err);

      if (err.message?.includes('not in your contacts')) {
        throw new Error('Пользователь не в ваших контактах. Сначала добавьте его в контакты.');
      } else {
        throw new Error(err.message || 'Ошибка при создании чата');
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  return {
    contacts,
    loading,
    error,
    searchUsers,
    addContact,
    removeContact,
    createChatWithContact,
    refetch: fetchContacts,
  };
}

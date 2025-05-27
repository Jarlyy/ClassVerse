"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface Homework {
  id: string;
  subject: string;
  task: string;
  due_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed?: boolean; // Вычисляемое поле на основе completed_homework
}

export interface CreateHomeworkData {
  subject: string;
  task: string;
  due_date: string;
}

export function useHomework() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Загрузка домашних заданий
  const loadHomework = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Получаем все домашние задания
      const { data: homeworkData, error: homeworkError } = await supabase
        .from('homework')
        .select('*')
        .order('due_date', { ascending: true });

      if (homeworkError) throw homeworkError;

      // Получаем информацию о выполненных заданиях для текущего пользователя
      const { data: completedData, error: completedError } = await supabase
        .from('completed_homework')
        .select('homework_id')
        .eq('user_id', user.id);

      if (completedError) throw completedError;

      // Создаем Set для быстрого поиска выполненных заданий
      const completedIds = new Set(completedData?.map(item => item.homework_id) || []);

      // Объединяем данные
      const homeworkWithStatus = homeworkData?.map(hw => ({
        ...hw,
        completed: completedIds.has(hw.id)
      })) || [];

      setHomework(homeworkWithStatus);
    } catch (err: any) {
      console.error('Error loading homework:', err);
      setError(err.message || 'Ошибка при загрузке домашних заданий');
    } finally {
      setLoading(false);
    }
  };

  // Создание нового домашнего задания
  const createHomework = async (data: CreateHomeworkData) => {
    if (!user) throw new Error('Пользователь не аутентифицирован');

    try {
      setSaving(true);
      setError(null);

      const { data: newHomework, error } = await supabase
        .from('homework')
        .insert({
          subject: data.subject,
          task: data.task,
          due_date: data.due_date,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Добавляем новое задание в локальный стейт
      const homeworkWithStatus = {
        ...newHomework,
        completed: false
      };

      setHomework(prev => [...prev, homeworkWithStatus]);
      return homeworkWithStatus;
    } catch (err: any) {
      console.error('Error creating homework:', err);
      setError(err.message || 'Ошибка при создании домашнего задания');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Отметка задания как выполненного/невыполненного
  const toggleHomeworkStatus = async (homeworkId: string) => {
    if (!user) return;

    try {
      const currentHomework = homework.find(hw => hw.id === homeworkId);
      if (!currentHomework) return;

      if (currentHomework.completed) {
        // Удаляем отметку о выполнении
        const { error } = await supabase
          .from('completed_homework')
          .delete()
          .eq('homework_id', homeworkId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Добавляем отметку о выполнении
        const { error } = await supabase
          .from('completed_homework')
          .insert({
            homework_id: homeworkId,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Обновляем локальный стейт
      setHomework(prev =>
        prev.map(hw =>
          hw.id === homeworkId
            ? { ...hw, completed: !hw.completed }
            : hw
        )
      );
    } catch (err: any) {
      console.error('Error toggling homework status:', err);
      setError(err.message || 'Ошибка при изменении статуса задания');
    }
  };

  // Удаление домашнего задания (только для создателя или админа)
  const deleteHomework = async (homeworkId: string) => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', homeworkId);

      if (error) throw error;

      // Удаляем из локального стейта
      setHomework(prev => prev.filter(hw => hw.id !== homeworkId));
    } catch (err: any) {
      console.error('Error deleting homework:', err);
      setError(err.message || 'Ошибка при удалении домашнего задания');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Получение статистики
  const getHomeworkStats = () => {
    const total = homework.length;
    const completed = homework.filter(hw => hw.completed).length;
    const pending = total - completed;

    // Подсчет просроченных заданий
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = homework.filter(hw => {
      if (hw.completed) return false;
      const dueDate = new Date(hw.due_date);
      return dueDate < today;
    }).length;

    return { total, completed, pending, overdue };
  };

  // Автозагрузка при монтировании
  useEffect(() => {
    if (user) {
      loadHomework();
    }
  }, [user]);

  return {
    homework,
    loading,
    saving,
    error,
    loadHomework,
    createHomework,
    toggleHomeworkStatus,
    deleteHomework,
    getHomeworkStats,
    setError
  };
}

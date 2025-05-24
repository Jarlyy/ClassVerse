"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

// Расписание времени уроков по умолчанию
const DEFAULT_LESSON_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '09:00', end: '09:45' },
  2: { start: '10:00', end: '10:45' },
  3: { start: '11:00', end: '11:45' },
  4: { start: '11:55', end: '12:40' },
  5: { start: '13:00', end: '13:45' },
  6: { start: '14:05', end: '14:50' },
  7: { start: '15:00', end: '15:45' },
  8: { start: '15:55', end: '16:40' },
};

export interface ScheduleLesson {
  id: string;
  class_name: string;
  day_of_week: number;
  day_name: string;
  lesson_number: number;
  subject_name: string;
  teacher_name: string;
  classroom: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface ClassInfo {
  class_name: string;
  student_count: number;
  lesson_count: number;
  last_updated: string;
}

export function useSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleLesson[]>([]);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Проверка прав администратора
  useEffect(() => {
    const checkAdminRights = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) throw error;
        setIsAdmin(data || false);
      } catch (err: any) {
        console.error('Error checking admin rights:', err);
        setIsAdmin(false);
      }
    };

    checkAdminRights();
  }, [user]);

  // Загрузка расписания
  const loadSchedule = useCallback(async (className?: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_class_schedule', {
        target_class_name: className || null
      });

      if (error) throw error;

      const formattedSchedule = (data || []).map((lesson: any) => ({
        id: lesson.id,
        class_name: lesson.class_name,
        day_of_week: lesson.day_of_week,
        day_name: lesson.day_name,
        lesson_number: lesson.lesson_number,
        subject_name: lesson.subject_name,
        teacher_name: lesson.teacher_name || '',
        classroom: lesson.classroom || '',
        start_time: lesson.start_time || '',
        end_time: lesson.end_time || '',
        created_at: lesson.created_at,
        updated_at: lesson.updated_at
      }));

      setSchedule(formattedSchedule);
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      setError(err.message || 'Ошибка при загрузке расписания');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Загрузка всех классов (только для админа)
  const loadAllClasses = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      const { data, error } = await supabase.rpc('get_all_classes_with_schedules');
      if (error) throw error;

      const formattedClasses = (data || []).map((classInfo: any) => ({
        class_name: classInfo.class_name,
        student_count: classInfo.student_count,
        lesson_count: classInfo.lesson_count,
        last_updated: classInfo.last_updated
      }));

      setAllClasses(formattedClasses);
    } catch (err: any) {
      console.error('Error loading all classes:', err);
      setError(err.message || 'Ошибка при загрузке списка классов');
    }
  }, [user, isAdmin]);

  // Добавление/обновление урока (только для админа)
  const upsertLesson = async (
    className: string,
    dayOfWeek: number,
    lessonNumber: number,
    subjectName: string,
    teacherName?: string,
    classroom?: string,
    startTime?: string,
    endTime?: string
  ) => {
    if (!user || !isAdmin) {
      throw new Error('Нет прав для редактирования расписания');
    }

    try {
      setSaving(true);
      setError(null);

      // Используем время по умолчанию, если не указано
      const defaultTimes = DEFAULT_LESSON_TIMES[lessonNumber] || { start: '', end: '' };
      const finalStartTime = startTime || defaultTimes.start || null;
      const finalEndTime = endTime || defaultTimes.end || null;

      const { data, error } = await supabase.rpc('upsert_schedule_lesson', {
        target_class_name: className,
        target_day_of_week: dayOfWeek,
        target_lesson_number: lessonNumber,
        target_subject_name: subjectName,
        target_teacher_name: teacherName || null,
        target_classroom: classroom || null,
        target_start_time: finalStartTime,
        target_end_time: finalEndTime
      });

      if (error) throw error;

      // Перезагружаем расписание
      await loadSchedule(className);

      return data;
    } catch (err: any) {
      console.error('Error upserting lesson:', err);
      setError(err.message || 'Ошибка при сохранении урока');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Удаление урока (только для админа)
  const deleteLesson = async (
    className: string,
    dayOfWeek: number,
    lessonNumber: number
  ) => {
    if (!user || !isAdmin) {
      throw new Error('Нет прав для редактирования расписания');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error } = await supabase.rpc('delete_schedule_lesson', {
        target_class_name: className,
        target_day_of_week: dayOfWeek,
        target_lesson_number: lessonNumber
      });

      if (error) throw error;

      // Перезагружаем расписание
      await loadSchedule(className);

      return data;
    } catch (err: any) {
      console.error('Error deleting lesson:', err);
      setError(err.message || 'Ошибка при удалении урока');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Группировка расписания по дням
  const getScheduleByDays = useCallback(() => {
    const days = [
      { id: 1, name: 'Понедельник' },
      { id: 2, name: 'Вторник' },
      { id: 3, name: 'Среда' },
      { id: 4, name: 'Четверг' },
      { id: 5, name: 'Пятница' },
      { id: 6, name: 'Суббота' },
      { id: 7, name: 'Воскресенье' }
    ];

    return days.map(day => ({
      ...day,
      lessons: schedule
        .filter(lesson => lesson.day_of_week === day.id)
        .sort((a, b) => a.lesson_number - b.lesson_number)
    }));
  }, [schedule]);

  // Получение урока по дню и номеру
  const getLesson = useCallback((dayOfWeek: number, lessonNumber: number) => {
    return schedule.find(
      lesson => lesson.day_of_week === dayOfWeek && lesson.lesson_number === lessonNumber
    );
  }, [schedule]);

  // Автозагрузка расписания при монтировании
  useEffect(() => {
    let mounted = true;

    if (user && !isAdmin && mounted) {
      // Для обычных пользователей загружаем их расписание
      // Для админа расписание загружается при выборе класса
      loadSchedule();
    }

    return () => {
      mounted = false;
    };
  }, [user, isAdmin]); // Убираем loadSchedule из зависимостей

  // Автозагрузка списка классов для админа
  useEffect(() => {
    let mounted = true;

    if (user && isAdmin && mounted) {
      loadAllClasses();
    }

    return () => {
      mounted = false;
    };
  }, [user, isAdmin]); // Убираем loadAllClasses из зависимостей

  return {
    schedule,
    allClasses,
    loading,
    saving,
    error,
    isAdmin,
    loadSchedule,
    loadAllClasses,
    upsertLesson,
    deleteLesson,
    getScheduleByDays,
    getLesson,
    setError
  };
}

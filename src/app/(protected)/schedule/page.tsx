"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchedule } from "@/hooks/useSchedule";
import { Calendar, Clock, MapPin, User, Plus, Edit, Trash2, Save, X, Settings } from "lucide-react";

// Расписание времени уроков
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

// Цвета для разных предметов (более мягкие, совместимые с темами)
const SUBJECT_COLORS: Record<string, { light: string; dark: string; accent: string }> = {
  'математика': {
    light: 'bg-blue-100 border-blue-200 text-blue-900',
    dark: 'dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
    accent: 'bg-blue-500'
  },
  'русский язык': {
    light: 'bg-red-100 border-red-200 text-red-900',
    dark: 'dark:bg-red-900/30 dark:border-red-700 dark:text-red-100',
    accent: 'bg-red-500'
  },
  'литература': {
    light: 'bg-pink-100 border-pink-200 text-pink-900',
    dark: 'dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-100',
    accent: 'bg-pink-500'
  },
  'физика': {
    light: 'bg-purple-100 border-purple-200 text-purple-900',
    dark: 'dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100',
    accent: 'bg-purple-500'
  },
  'химия': {
    light: 'bg-green-100 border-green-200 text-green-900',
    dark: 'dark:bg-green-900/30 dark:border-green-700 dark:text-green-100',
    accent: 'bg-green-500'
  },
  'биология': {
    light: 'bg-emerald-100 border-emerald-200 text-emerald-900',
    dark: 'dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-100',
    accent: 'bg-emerald-500'
  },
  'история': {
    light: 'bg-amber-100 border-amber-200 text-amber-900',
    dark: 'dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100',
    accent: 'bg-amber-500'
  },
  'география': {
    light: 'bg-teal-100 border-teal-200 text-teal-900',
    dark: 'dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-100',
    accent: 'bg-teal-500'
  },
  'английский язык': {
    light: 'bg-indigo-100 border-indigo-200 text-indigo-900',
    dark: 'dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-100',
    accent: 'bg-indigo-500'
  },
  'информатика': {
    light: 'bg-cyan-100 border-cyan-200 text-cyan-900',
    dark: 'dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-100',
    accent: 'bg-cyan-500'
  },
  'физкультура': {
    light: 'bg-orange-100 border-orange-200 text-orange-900',
    dark: 'dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100',
    accent: 'bg-orange-500'
  },
  'обж': {
    light: 'bg-slate-100 border-slate-200 text-slate-900',
    dark: 'dark:bg-slate-800/30 dark:border-slate-600 dark:text-slate-100',
    accent: 'bg-slate-500'
  },
  'музыка': {
    light: 'bg-violet-100 border-violet-200 text-violet-900',
    dark: 'dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-100',
    accent: 'bg-violet-500'
  },
  'изо': {
    light: 'bg-rose-100 border-rose-200 text-rose-900',
    dark: 'dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-100',
    accent: 'bg-rose-500'
  },
  'технология': {
    light: 'bg-yellow-100 border-yellow-200 text-yellow-900',
    dark: 'dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100',
    accent: 'bg-yellow-500'
  },
};

// Функция для получения цвета предмета
const getSubjectColor = (subjectName: string) => {
  const normalizedName = subjectName.toLowerCase().trim();
  const colors = SUBJECT_COLORS[normalizedName] || {
    light: 'bg-blue-100 border-blue-200 text-blue-900',
    dark: 'dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
    accent: 'bg-blue-500'
  };
  return colors;
};

interface EditingLesson {
  dayOfWeek: number;
  lessonNumber: number;
  subjectName: string;
  teacherName: string;
  classroom: string;
  startTime: string;
  endTime: string;
}

export default function SchedulePage() {
  const {
    schedule,
    allClasses,
    loading,
    saving,
    error,
    isAdmin,
    loadSchedule,
    upsertLesson,
    deleteLesson,
    getScheduleByDays,
    getLesson,
    setError
  } = useSchedule();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<EditingLesson | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const scheduleByDays = useMemo(() => getScheduleByDays(), [getScheduleByDays]);

  // Отладочная информация (закомментировано для производительности)
  // console.log('SchedulePage state:', {
  //   isAdmin,
  //   selectedClass,
  //   scheduleLength: schedule.length,
  //   loading,
  //   allClassesLength: allClasses.length
  // });

  // Обработка сохранения урока
  const handleSaveLesson = async () => {
    if (!editingLesson || !selectedClass) return;

    try {
      await upsertLesson(
        selectedClass,
        editingLesson.dayOfWeek,
        editingLesson.lessonNumber,
        editingLesson.subjectName,
        editingLesson.teacherName,
        editingLesson.classroom,
        editingLesson.startTime,
        editingLesson.endTime
      );
      setEditingLesson(null);
    } catch (err) {
      // Ошибка уже обработана в хуке
    }
  };

  // Обработка удаления урока
  const handleDeleteLesson = async (dayOfWeek: number, lessonNumber: number) => {
    if (!selectedClass) return;

    if (confirm('Вы уверены, что хотите удалить этот урок?')) {
      try {
        await deleteLesson(selectedClass, dayOfWeek, lessonNumber);
      } catch (err) {
        // Ошибка уже обработана в хуке
      }
    }
  };

  // Начало редактирования урока
  const startEditingLesson = (dayOfWeek: number, lessonNumber: number) => {
    if (!isAdmin || !selectedClass || !showAdminPanel) {
      return;
    }

    const existingLesson = getLesson(dayOfWeek, lessonNumber);
    const defaultTimes = DEFAULT_LESSON_TIMES[lessonNumber] || { start: '', end: '' };

    setEditingLesson({
      dayOfWeek,
      lessonNumber,
      subjectName: existingLesson?.subject_name || '',
      teacherName: existingLesson?.teacher_name || '',
      classroom: existingLesson?.classroom || '',
      startTime: existingLesson?.start_time || defaultTimes.start,
      endTime: existingLesson?.end_time || defaultTimes.end
    });
  };

  // Загрузка расписания при смене класса (только для админа)
  useEffect(() => {
    if (isAdmin && selectedClass) {
      loadSchedule(selectedClass);
    }
  }, [selectedClass, loadSchedule, isAdmin]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={24} />
          <h1 className="text-2xl font-bold">
            Расписание
            {selectedClass && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                - {selectedClass}
              </span>
            )}
          </h1>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="flex items-center gap-2"
          >
            <Settings size={16} />
            {showAdminPanel ? 'Скрыть панель' : 'Панель админа'}
          </Button>
        )}
      </div>

      {/* Ошибки */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-2 h-auto p-1"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Панель администратора */}
      {isAdmin && showAdminPanel && (
        <Card>
          <CardHeader>
            <CardTitle>Панель администратора</CardTitle>
            <CardDescription>
              Управление расписаниями всех классов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Выберите класс для редактирования:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Выберите класс...</option>
                  {allClasses.map((classInfo) => (
                    <option key={classInfo.class_name} value={classInfo.class_name}>
                      {classInfo.class_name} ({classInfo.student_count} учеников, {classInfo.lesson_count} уроков)
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div className="text-sm text-muted-foreground">
                  Редактируется расписание для класса: <strong>{selectedClass}</strong>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Сообщение для админа когда класс выбран но расписание пустое */}
      {isAdmin && selectedClass && schedule.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Расписание для класса {selectedClass} пустое</h3>
            <p className="text-muted-foreground mb-4">
              Начните создавать расписание, нажав кнопку "+" рядом с нужным уроком.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Основное расписание */}
      {(schedule.length > 0 || (isAdmin && selectedClass && showAdminPanel)) && (
        <div className="space-y-6">
          {/* Табличный вид расписания */}
          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-3 text-left font-medium">Урок</th>
                      <th className="border border-border p-3 text-left font-medium">Время</th>
                      {scheduleByDays.map((day, index) => (
                        <th key={day.id} className={`border border-border p-3 text-left font-medium ${
                          index === 5 || index === 6 ? 'bg-muted' : ''
                        }`}>
                          {day.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((lessonNumber) => {
                      const defaultTimes = DEFAULT_LESSON_TIMES[lessonNumber] || { start: '', end: '' };

                      return (
                        <tr key={lessonNumber} className="hover:bg-muted/20 transition-colors">
                          <td className="border border-border p-3 text-center bg-muted/30">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto">
                              {lessonNumber}
                            </div>
                          </td>
                          <td className="border border-border p-3 text-sm">
                            {defaultTimes.start && defaultTimes.end && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock size={14} className="text-primary" />
                                <span className="font-medium">{defaultTimes.start} - {defaultTimes.end}</span>
                              </div>
                            )}
                          </td>
                          {scheduleByDays.map((day) => {
                            const lesson = day.lessons.find(l => l.lesson_number === lessonNumber);
                            const isEditing = editingLesson?.dayOfWeek === day.id && editingLesson?.lessonNumber === lessonNumber;

                            return (
                              <td key={day.id} className={`border border-border p-3 relative min-h-[80px] ${
                                day.id === 6 || day.id === 7 ? 'bg-muted/30' : ''
                              }`}>
                                {isEditing ? (
                                  // Режим редактирования
                                  <div className="space-y-1">
                                    <Input
                                      placeholder="Предмет"
                                      value={editingLesson.subjectName}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        subjectName: e.target.value
                                      })}
                                      className="text-xs h-6"
                                    />
                                    <Input
                                      placeholder="Учитель"
                                      value={editingLesson.teacherName}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        teacherName: e.target.value
                                      })}
                                      className="text-xs h-6"
                                    />
                                    <Input
                                      placeholder="Кабинет"
                                      value={editingLesson.classroom}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        classroom: e.target.value
                                      })}
                                      className="text-xs h-6"
                                    />
                                    <div className="flex gap-1 mt-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveLesson}
                                        disabled={saving || !editingLesson.subjectName.trim()}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Save size={10} />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingLesson(null)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <X size={10} />
                                      </Button>
                                    </div>
                                  </div>
                                ) : lesson ? (
                                  // Отображение урока
                                  <div className="group relative">
                                    <div className={`${getSubjectColor(lesson.subject_name).light} ${getSubjectColor(lesson.subject_name).dark} p-3 rounded-lg border-2 hover:shadow-md transition-all relative overflow-hidden`}>
                                      {/* Цветная полоска слева */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getSubjectColor(lesson.subject_name).accent}`}></div>

                                      <div className="font-semibold text-sm mb-2 pl-2">{lesson.subject_name}</div>
                                      {lesson.teacher_name && (
                                        <div className="text-xs opacity-80 flex items-center gap-1 mb-1 pl-2">
                                          <User size={12} />
                                          {lesson.teacher_name}
                                        </div>
                                      )}
                                      {lesson.classroom && (
                                        <div className="text-xs opacity-80 flex items-center gap-1 pl-2">
                                          <MapPin size={12} />
                                          {lesson.classroom}
                                        </div>
                                      )}
                                    </div>

                                    {/* Кнопки управления для админа */}
                                    {isAdmin && selectedClass && showAdminPanel && (
                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => startEditingLesson(day.id, lessonNumber)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Edit size={10} />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteLesson(day.id, lessonNumber)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Trash2 size={10} />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Пустой слот
                                  <div className="group relative min-h-[60px] flex items-center justify-center">
                                    <div className="w-full h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-muted/50 transition-all">
                                      <span className="text-sm text-muted-foreground group-hover:text-primary">
                                        {isAdmin && selectedClass && showAdminPanel ? 'Нажмите для добавления' : '—'}
                                      </span>
                                    </div>

                                    {/* Кнопка добавления для админа */}
                                    {isAdmin && selectedClass && showAdminPanel && (
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                          size="sm"
                                          onClick={() => startEditingLesson(day.id, lessonNumber)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Plus size={14} />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Пустое состояние */}
      {schedule.length === 0 && !loading && !(isAdmin && selectedClass && showAdminPanel) && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Расписание не найдено</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? 'Откройте панель администратора и выберите класс для просмотра или создания расписания.'
                : 'Для вашего класса пока не создано расписание.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchedule } from "@/hooks/useSchedule";
import { useAuth } from "@/hooks/useAuth";
import { useHomework } from "@/hooks/useHomework";
import { Calendar, Clock, MapPin, User, BookOpen, ChevronRight, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { schedule, loading, loadSchedule } = useSchedule();
  const { homework, loading: homeworkLoading } = useHomework();
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Получаем текущий день недели (1 = понедельник, 7 = воскресенье)
  const getCurrentDayOfWeek = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 7 : day; // Воскресенье = 7
  };

  // Загружаем расписание при монтировании
  useEffect(() => {
    if (user && !initialized) {
      setInitialized(true);
      loadSchedule();
    }
  }, [user, initialized, loadSchedule]);

  // Фильтруем расписание на сегодня
  useEffect(() => {
    if (initialized) {
      const currentDay = getCurrentDayOfWeek();
      const todayLessons = schedule
        .filter(lesson => lesson.day_of_week === currentDay)
        .sort((a, b) => a.lesson_number - b.lesson_number);
      setTodaySchedule(todayLessons);
    }
  }, [schedule, initialized]);

  // Получаем ближайшие домашние задания (не выполненные, отсортированные по дате)
  const getUpcomingHomework = () => {
    return homework
      .filter(hw => !hw.completed)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 3); // Показываем только 3 ближайших
  };

  // Форматирование даты для домашних заданий
  const formatHomeworkDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Сбрасываем время для корректного сравнения
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Сегодня";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Завтра";
    } else {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    }
  };

  // Определение цвета статуса для домашних заданий
  const getHomeworkStatusColor = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    } else if (diffDays <= 1) {
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    } else if (diffDays <= 3) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    } else {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Дашборд</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Расписание на сегодня
            </CardTitle>
            <CardDescription>
              {getCurrentDayOfWeek() === 6 || getCurrentDayOfWeek() === 7
                ? 'Сегодня выходной день'
                : 'Ваши уроки на сегодня'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              {!initialized || loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="ml-2">Загрузка расписания...</span>
                </div>
              ) : todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {/* Красивые карточки уроков */}
                  <div className="space-y-3">
                    {todaySchedule.map((lesson, index) => {
                      // Цвета для разных предметов (совместимые с темами)
                      const getSubjectColor = (subjectName: string) => {
                        const colors: Record<string, { light: string; dark: string; accent: string }> = {
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
                        };
                        const normalizedName = subjectName.toLowerCase().trim();
                        return colors[normalizedName] || {
                          light: 'bg-blue-100 border-blue-200 text-blue-900',
                          dark: 'dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
                          accent: 'bg-blue-500'
                        };
                      };

                      const colors = getSubjectColor(lesson.subject_name);

                      return (
                        <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {lesson.lesson_number}
                          </div>
                          <div className={`flex-1 ${colors.light} ${colors.dark} p-3 rounded-lg border-2 relative overflow-hidden`}>
                            {/* Цветная полоска слева */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.accent}`}></div>

                            <div className="font-semibold text-sm mb-1 pl-2">{lesson.subject_name}</div>
                            <div className="flex items-center gap-3 text-xs opacity-80 pl-2">
                              {lesson.teacher_name && (
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {lesson.teacher_name}
                                </span>
                              )}
                              {lesson.classroom && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  {lesson.classroom}
                                </span>
                              )}
                              {lesson.start_time && lesson.end_time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {lesson.start_time} - {lesson.end_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {getCurrentDayOfWeek() === 6 || getCurrentDayOfWeek() === 7
                      ? 'Сегодня выходной день'
                      : 'На сегодня уроков нет'
                    }
                  </p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 flex items-center justify-center gap-2"
              onClick={() => router.push('/schedule')}
            >
              Полное расписание
              <ChevronRight size={16} />
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} />
              Домашние задания
            </CardTitle>
            <CardDescription>Задания на ближайшие дни</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              {homeworkLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="ml-2">Загрузка заданий...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {getUpcomingHomework().length > 0 ? (
                    getUpcomingHomework().map(hw => (
                      <div key={hw.id} className="p-3 border rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium">{hw.subject}</p>
                          <span className={`text-xs px-2 py-1 rounded ${getHomeworkStatusColor(hw.due_date)}`}>
                            До {formatHomeworkDate(hw.due_date)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {hw.task}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Нет невыполненных заданий
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 flex items-center justify-center gap-2"
              onClick={() => router.push('/homework')}
            >
              Все задания
              <ChevronRight size={16} />
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Тайный друг
            </CardTitle>
            <CardDescription>Функция в разработке</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Эта функция будет добавлена позже
                </p>
                <p className="text-xs text-muted-foreground">
                  Сейчас мы работаем над более важными функциями: расписанием, домашними заданиями и чатами.
                </p>
              </div>
            </div>

            <Button className="w-full mt-4" disabled>
              Скоро будет доступно
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

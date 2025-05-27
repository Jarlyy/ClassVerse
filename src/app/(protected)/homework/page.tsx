"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Clock, Calendar, Search, X, Loader2, Trash2 } from "lucide-react";
import { useHomework } from "@/hooks/useHomework";
import { AddHomeworkDialog } from "@/components/homework/AddHomeworkDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function HomeworkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, completed

  const {
    homework,
    loading,
    saving,
    error,
    toggleHomeworkStatus,
    deleteHomework,
    getHomeworkStats,
    loadHomework
  } = useHomework();

  const { user } = useAuth();

  // Фильтрация и поиск
  const filteredHomework = homework.filter(hw => {
    const matchesSearch = hw.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hw.task.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "pending") return matchesSearch && !hw.completed;
    if (filter === "completed") return matchesSearch && hw.completed;

    return matchesSearch;
  });

  // Обработчик удаления задания
  const handleDeleteHomework = async (homeworkId: string) => {
    if (confirm("Вы уверены, что хотите удалить это задание?")) {
      try {
        await deleteHomework(homeworkId);
        toast.success("Задание удалено");
      } catch (error) {
        toast.error("Не удалось удалить задание");
      }
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  // Определение срочности задания
  const getDueStatus = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays <= 2) return "soon";
    return "normal";
  };

  // Получение статистики
  const stats = getHomeworkStats();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Домашние задания</h1>
          <p className="text-muted-foreground mt-1">
            Всего: {stats.total} | Выполнено: {stats.completed} | Осталось: {stats.pending}
            {stats.overdue > 0 && (
              <span className="text-red-600 ml-2">| Просрочено: {stats.overdue}</span>
            )}
          </p>
        </div>

        <AddHomeworkDialog onSuccess={loadHomework} />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Поиск заданий"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setFilter("all")}
                >
                  <Calendar size={18} className="mr-2" />
                  Все задания
                </Button>
                <Button
                  variant={filter === "pending" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setFilter("pending")}
                >
                  <Clock size={18} className="mr-2" />
                  Невыполненные
                </Button>
                <Button
                  variant={filter === "completed" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setFilter("completed")}
                >
                  <Check size={18} className="mr-2" />
                  Выполненные
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Список заданий</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredHomework.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет заданий, соответствующих фильтрам
                  </div>
                ) : (
                  filteredHomework.map(hw => {
                    const dueStatus = getDueStatus(hw.due_date);

                    return (
                      <div
                        key={hw.id}
                        className={`p-4 border rounded-md flex items-start gap-4 ${
                          hw.completed ? "bg-secondary/30" : ""
                        }`}
                      >
                        <Button
                          variant="outline"
                          size="icon"
                          className={`rounded-full ${hw.completed ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => toggleHomeworkStatus(hw.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : hw.completed ? (
                            <Check size={18} />
                          ) : (
                            <X size={18} className="opacity-0" />
                          )}
                        </Button>

                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className={`font-medium ${hw.completed ? "line-through text-muted-foreground" : ""}`}>
                                {hw.subject}
                              </h3>
                              <p className={`mt-1 ${hw.completed ? "line-through text-muted-foreground" : ""}`}>
                                {hw.task}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                hw.completed
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                  : dueStatus === "overdue"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                    : dueStatus === "today"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                      : dueStatus === "soon"
                                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              }`}>
                                {hw.completed
                                  ? "Выполнено"
                                  : dueStatus === "overdue"
                                    ? "Просрочено"
                                    : dueStatus === "today"
                                      ? "Сегодня"
                                      : `До ${formatDate(hw.due_date)}`}
                              </div>

                              {/* Кнопка удаления (только для создателя) */}
                              {hw.created_by === user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteHomework(hw.id)}
                                  disabled={saving}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

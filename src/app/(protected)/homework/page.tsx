"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Clock, Calendar, Search, Plus, X } from "lucide-react";

// Имитация данных о домашних заданиях
const HOMEWORK_DATA = [
  {
    id: 1,
    subject: "Математика",
    task: "Решить задачи №145-150 из учебника",
    dueDate: "2025-05-23",
    completed: false,
  },
  {
    id: 2,
    subject: "Литература",
    task: "Прочитать \"Война и мир\", том 1",
    dueDate: "2025-05-25",
    completed: false,
  },
  {
    id: 3,
    subject: "Физика",
    task: "Подготовить доклад о Николе Тесле",
    dueDate: "2025-05-26",
    completed: false,
  },
  {
    id: 4,
    subject: "История",
    task: "Выучить даты важнейших событий XX века",
    dueDate: "2025-05-24",
    completed: true,
  },
  {
    id: 5,
    subject: "Английский",
    task: "Выполнить упражнения 10-15 на стр. 45",
    dueDate: "2025-05-23",
    completed: true,
  },
  {
    id: 6,
    subject: "Химия",
    task: "Подготовиться к лабораторной работе по теме \"Кислоты\"",
    dueDate: "2025-05-27",
    completed: false,
  },
  {
    id: 7,
    subject: "Биология",
    task: "Составить схему \"Строение клетки\"",
    dueDate: "2025-05-28",
    completed: false,
  },
];

export default function HomeworkPage() {
  const [homeworkList, setHomeworkList] = useState(HOMEWORK_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, completed
  
  // Фильтрация и поиск
  const filteredHomework = homeworkList.filter(hw => {
    const matchesSearch = hw.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         hw.task.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "pending") return matchesSearch && !hw.completed;
    if (filter === "completed") return matchesSearch && hw.completed;
    
    return matchesSearch;
  });
  
  // Обработчик изменения статуса задания
  const toggleHomeworkStatus = (id: number) => {
    setHomeworkList(prev => 
      prev.map(hw => 
        hw.id === id ? { ...hw, completed: !hw.completed } : hw
      )
    );
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
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Домашние задания</h1>
        
        <Button>
          <Plus size={18} className="mr-2" />
          Добавить задание
        </Button>
      </div>
      
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
                  filteredHomework.map(homework => {
                    const dueStatus = getDueStatus(homework.dueDate);
                    
                    return (
                      <div 
                        key={homework.id} 
                        className={`p-4 border rounded-md flex items-start gap-4 ${
                          homework.completed ? "bg-secondary/30" : ""
                        }`}
                      >
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`rounded-full ${homework.completed ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => toggleHomeworkStatus(homework.id)}
                        >
                          {homework.completed ? <Check size={18} /> : <X size={18} className="opacity-0" />}
                        </Button>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`font-medium ${homework.completed ? "line-through text-muted-foreground" : ""}`}>
                                {homework.subject}
                              </h3>
                              <p className={`mt-1 ${homework.completed ? "line-through text-muted-foreground" : ""}`}>
                                {homework.task}
                              </p>
                            </div>
                            
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              homework.completed 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                                : dueStatus === "overdue" 
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                  : dueStatus === "today"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                    : dueStatus === "soon"
                                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            }`}>
                              {homework.completed 
                                ? "Выполнено" 
                                : dueStatus === "overdue" 
                                  ? "Просрочено" 
                                  : dueStatus === "today" 
                                    ? "Сегодня" 
                                    : `До ${formatDate(homework.dueDate)}`}
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

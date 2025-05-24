"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Дни недели
const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

// Временные слоты
const TIME_SLOTS = [
  { start: "8:30", end: "9:15", number: 1 },
  { start: "9:30", end: "10:15", number: 2 },
  { start: "10:30", end: "11:15", number: 3 },
  { start: "11:30", end: "12:15", number: 4 },
  { start: "12:30", end: "13:15", number: 5 },
  { start: "13:30", end: "14:15", number: 6 },
  { start: "14:30", end: "15:15", number: 7 },
];

// Предметы
const SUBJECTS = [
  { name: "Математика", room: "305", color: "bg-blue-100 dark:bg-blue-900" },
  { name: "Русский язык", room: "201", color: "bg-red-100 dark:bg-red-900" },
  { name: "Физика", room: "401", color: "bg-purple-100 dark:bg-purple-900" },
  { name: "История", room: "203", color: "bg-yellow-100 dark:bg-yellow-900" },
  { name: "Биология", room: "302", color: "bg-green-100 dark:bg-green-900" },
  { name: "Литература", room: "201", color: "bg-pink-100 dark:bg-pink-900" },
  { name: "Информатика", room: "404", color: "bg-indigo-100 dark:bg-indigo-900" },
  { name: "Физкультура", room: "Спортзал", color: "bg-orange-100 dark:bg-orange-900" },
  { name: "Английский", room: "301", color: "bg-teal-100 dark:bg-teal-900" },
  { name: "Химия", room: "405", color: "bg-cyan-100 dark:bg-cyan-900" },
];

// Расписание (имитация данных)
const SCHEDULE = DAYS.map(day => {
  return {
    day,
    lessons: TIME_SLOTS.map(slot => {
      // Случайно выбираем предмет или оставляем пустым (null)
      return Math.random() > 0.3 
        ? SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)] 
        : null;
    })
  };
});

export default function SchedulePage() {
  const [currentWeek, setCurrentWeek] = useState("22 - 28 мая");
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Расписание</h1>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon">
            <ChevronLeft size={18} />
          </Button>
          <span className="font-medium">{currentWeek}</span>
          <Button variant="outline" size="icon">
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Расписание на неделю</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-medium">Урок</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-3 text-left font-medium">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium">{slot.number} урок</div>
                      <div className="text-sm text-muted-foreground">{slot.start} - {slot.end}</div>
                    </td>
                    
                    {SCHEDULE.map((day, dayIndex) => {
                      const lesson = day.lessons[index];
                      return (
                        <td key={dayIndex} className="p-3">
                          {lesson ? (
                            <div className={`p-2 rounded ${lesson.color}`}>
                              <div className="font-medium">{lesson.name}</div>
                              <div className="text-sm">Кабинет {lesson.room}</div>
                            </div>
                          ) : (
                            <div className="p-2 rounded bg-secondary text-center">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Посещаемость</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>В школе</span>
                </div>
                <Button variant="outline" size="sm">Отметить</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Опаздываю</span>
                </div>
                <Button variant="outline" size="sm">Отметить</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Болею</span>
                </div>
                <Button variant="outline" size="sm">Отметить</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>Уведомления о начале урока</span>
                <div className="w-10 h-6 bg-primary rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>Уведомления о домашних заданиях</span>
                <div className="w-10 h-6 bg-primary rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>Уведомления о контрольных работах</span>
                <div className="w-10 h-6 bg-primary rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

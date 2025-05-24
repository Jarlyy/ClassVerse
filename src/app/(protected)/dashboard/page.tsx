"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Дашборд</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Расписание на сегодня</CardTitle>
            <CardDescription>Ваши уроки на сегодня</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="font-medium">Математика</p>
                  <p className="text-sm text-muted-foreground">Кабинет 305</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">8:30 - 9:15</p>
                  <p className="text-xs text-muted-foreground">1 урок</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="font-medium">Русский язык</p>
                  <p className="text-sm text-muted-foreground">Кабинет 201</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">9:30 - 10:15</p>
                  <p className="text-xs text-muted-foreground">2 урок</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="font-medium">Физика</p>
                  <p className="text-sm text-muted-foreground">Кабинет 401</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">10:30 - 11:15</p>
                  <p className="text-xs text-muted-foreground">3 урок</p>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4">Полное расписание</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Домашние задания</CardTitle>
            <CardDescription>Задания на ближайшие дни</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border rounded-md">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">Математика</p>
                  <p className="text-sm text-muted-foreground">До завтра</p>
                </div>
                <p className="text-sm">Решить задачи №145-150 из учебника</p>
              </div>
              
              <div className="p-3 border rounded-md">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">Литература</p>
                  <p className="text-sm text-muted-foreground">До 25 мая</p>
                </div>
                <p className="text-sm">Прочитать "Война и мир", том 1</p>
              </div>
              
              <div className="p-3 border rounded-md">
                <div className="flex justify-between mb-2">
                  <p className="font-medium">Физика</p>
                  <p className="text-sm text-muted-foreground">До 26 мая</p>
                </div>
                <p className="text-sm">Подготовить доклад о Николе Тесле</p>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4">Все задания</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Тайный друг</CardTitle>
            <CardDescription>Ваша текущая миссия</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/10 rounded-lg mb-4">
              <p className="font-medium mb-2">Миссия на эту неделю:</p>
              <p className="text-sm">Отправьте анонимное сообщение поддержки вашему тайному другу перед контрольной работой по математике.</p>
            </div>
            
            <Button className="w-full">Отправить сообщение</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

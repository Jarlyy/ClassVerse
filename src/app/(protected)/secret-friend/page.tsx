"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Heart, Send, MessageSquare, Gift, Clock } from "lucide-react";

// Имитация данных о тайном друге
const SECRET_FRIEND = {
  active: true,
  weekStart: "22 мая",
  weekEnd: "28 мая",
  mission: "Отправьте анонимное сообщение поддержки вашему тайному другу перед контрольной работой по математике.",
  messages: [
    {
      id: 1,
      incoming: true,
      content: "Привет! Ты отлично выступил на уроке литературы сегодня. Твой анализ произведения был очень глубоким!",
      timestamp: "Вчера, 15:30",
    },
    {
      id: 2,
      incoming: false,
      content: "Спасибо большое! Очень приятно получить такой отзыв. Я старался хорошо подготовиться.",
      timestamp: "Вчера, 16:45",
    },
    {
      id: 3,
      incoming: true,
      content: "Не переживай насчет завтрашней контрольной по математике. Я уверен, что ты справишься! Если нужна помощь с подготовкой, дай знать.",
      timestamp: "Сегодня, 10:15",
    },
  ],
  previousMissions: [
    {
      week: "15 - 21 мая",
      mission: "Отправьте тайному другу стихотворение, которое напоминает вам о нем.",
      completed: true,
    },
    {
      week: "8 - 14 мая",
      mission: "Сделайте комплимент тайному другу о его успехах в учебе.",
      completed: true,
    },
    {
      week: "1 - 7 мая",
      mission: "Поделитесь с тайным другом интересным фактом, который он может не знать.",
      completed: false,
    },
  ],
};

export default function SecretFriendPage() {
  const [message, setMessage] = useState("");
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      console.log("Sending secret message:", message);
      setMessage("");
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Тайный друг</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader className="bg-primary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Heart className="text-primary" size={20} />
                Текущая миссия
              </CardTitle>
              <CardDescription>
                Неделя: {SECRET_FRIEND.weekStart} - {SECRET_FRIEND.weekEnd}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg">{SECRET_FRIEND.mission}</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <Send size={18} className="mr-2" />
                Выполнить миссию
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={20} />
                Сообщения
              </CardTitle>
              <CardDescription>
                Анонимное общение с вашим тайным другом
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto p-2">
                {SECRET_FRIEND.messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.incoming ? "justify-start" : "justify-end"}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.incoming 
                          ? "bg-secondary" 
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.incoming 
                          ? "text-muted-foreground" 
                          : "text-primary-foreground/70"
                      }`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  placeholder="Введите анонимное сообщение..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <Send size={18} className="mr-2" />
                  Отправить
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift size={20} />
                Как это работает
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">1. Еженедельные пары</h3>
                  <p className="text-sm text-muted-foreground">
                    Каждую неделю система случайным образом выбирает пары учеников для анонимного общения.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">2. Уникальные миссии</h3>
                  <p className="text-sm text-muted-foreground">
                    Вы получаете еженедельную миссию, которую нужно выполнить для своего тайного друга.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">3. Анонимное общение</h3>
                  <p className="text-sm text-muted-foreground">
                    Все сообщения отправляются анонимно, но вы можете свободно общаться со своим тайным другом.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">4. Новые знакомства</h3>
                  <p className="text-sm text-muted-foreground">
                    Это отличный способ познакомиться с одноклассниками, с которыми вы обычно мало общаетесь.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Предыдущие миссии
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {SECRET_FRIEND.previousMissions.map((mission, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex justify-between mb-1">
                      <p className="font-medium">{mission.week}</p>
                      {mission.completed ? (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded-full">
                          Выполнено
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 px-2 py-1 rounded-full">
                          Пропущено
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{mission.mission}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

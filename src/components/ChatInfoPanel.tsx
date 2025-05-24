"use client";

import { ArrowLeft, Phone, Video, VolumeX, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ChatInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatName: string;
  chatDescription: string;
  isPrivateChat: boolean;
  lastSeen?: string;
  username?: string;
  bio?: string;
}

export function ChatInfoPanel({
  isOpen,
  onClose,
  chatName,
  chatDescription,
  isPrivateChat,
  lastSeen,
  username,
  bio
}: ChatInfoPanelProps) {
  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="absolute inset-0 bg-background z-50 flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-medium">Информация</h1>
      </div>

      {/* Основная информация */}
      <div className="flex-1 overflow-auto">
        {/* Аватар и основная информация */}
        <div className="flex flex-col items-center p-6 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-4 ${
            isPrivateChat
              ? 'bg-green-500 text-white'
              : 'bg-primary text-primary-foreground'
          }`}>
            {getInitials(chatName)}
          </div>

          <h2 className="text-xl font-semibold mb-1">{chatName}</h2>

          {isPrivateChat && lastSeen && (
            <p className="text-sm text-muted-foreground mb-4">{lastSeen}</p>
          )}

          {!isPrivateChat && (
            <p className="text-sm text-muted-foreground mb-4">{chatDescription}</p>
          )}
        </div>

        {/* Кнопки действий для личного чата */}
        {isPrivateChat && (
          <div className="px-6 mb-6">
            <div className="grid grid-cols-5 gap-4">
              <div className="flex flex-col items-center">
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full mb-2">
                  <Phone size={20} />
                </Button>
                <span className="text-xs text-center">Позвонить</span>
              </div>

              <div className="flex flex-col items-center">
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full mb-2">
                  <Video size={20} />
                </Button>
                <span className="text-xs text-center">Видеозвонок</span>
              </div>

              <div className="flex flex-col items-center">
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full mb-2">
                  <VolumeX size={20} />
                </Button>
                <span className="text-xs text-center">Убрать звук</span>
              </div>

              <div className="flex flex-col items-center">
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full mb-2">
                  <MoreHorizontal size={20} />
                </Button>
                <span className="text-xs text-center">Ещё</span>
              </div>
            </div>
          </div>
        )}

        {/* Дополнительная информация */}
        <div className="px-6 space-y-4">
          {isPrivateChat && username && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Имя пользователя</p>
                    <p className="font-medium">{username}</p>
                  </div>

                  {bio && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">О себе</p>
                        <p className="font-medium">{bio}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Настройки уведомлений */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Уведомления</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Звук уведомлений</span>
                  <Button variant="ghost" size="sm">
                    Включен
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Показывать превью</span>
                  <Button variant="ghost" size="sm">
                    Включено
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Дополнительные действия */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Действия</h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm">
                  Поиск по сообщениям
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm">
                  Экспорт чата
                </Button>
                {isPrivateChat && (
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Добавить в контакты
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

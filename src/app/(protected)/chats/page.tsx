"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Send, Plus, Trash2, Users } from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useGroups } from "@/hooks/useGroups";
import { CreateChatDialog } from "@/components/CreateChatDialog";
import { GroupMembersDialog } from "@/components/GroupMembersDialog";

export default function ChatsPage() {
  const [message, setMessage] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { channels, loading: channelsLoading, createChannel, createPrivateChat, deleteChannel, refetch: fetchChannels } = useChannels();
  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedChannelId);
  const { createChatWithContact } = useContacts();
  const { createGroup } = useGroups();

  // Автоматическая прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Фильтрация каналов по поисковому запросу
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Выбранный канал
  const selectedChannel = channels.find(channel => channel.id === selectedChannelId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedChannelId) {
      try {
        await sendMessage(message);
        setMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleCreateChannel = async (name: string, description?: string) => {
    const groupId = await createGroup(name, description);
    // Обновляем список каналов
    await fetchChannels();
    // Автоматически выбираем созданную группу
    setSelectedChannelId(groupId);
  };

  const handleCreateChatWithContact = async (contactId: string) => {
    const chatId = await createChatWithContact(contactId);
    // Автоматически выбираем созданный чат
    setSelectedChannelId(chatId);
    // Обновляем список каналов
    await fetchChannels();
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (confirm("Вы уверены, что хотите удалить этот канал?")) {
      try {
        await deleteChannel(channelId);
        if (selectedChannelId === channelId) {
          setSelectedChannelId(null);
        }
      } catch (error) {
        console.error("Error deleting channel:", error);
      }
    }
  };

  // Получаем инициалы для аватара канала
  const getChannelInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Получаем отображаемое имя канала
  const getChannelDisplayName = (channel: Channel) => {
    if (channel.is_private) {
      // Для личных чатов показываем имя другого участника
      const otherParticipant = channel.participants?.find(p => p.id !== user?.id);
      if (otherParticipant) {
        return otherParticipant.name;
      }

      // Fallback: ищем по ID участников
      const otherUserId = channel.participant_ids.find(id => id !== user?.id);
      if (otherUserId) {
        // Пытаемся найти имя в описании канала
        const description = channel.description || '';
        const match = description.match(/между (.+) и (.+)$/);
        if (match) {
          const [, name1, name2] = match;
          // Возвращаем имя того, кто не является текущим пользователем
          const currentUserName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';
          if (name1.includes(currentUserName)) {
            return name2;
          } else {
            return name1;
          }
        }
      }

      // Последний fallback
      return 'Собеседник';
    }
    return channel.name;
  };

  // Получаем описание канала
  const getChannelDescription = (channel: Channel) => {
    if (channel.is_private) {
      return 'Личный чат';
    }
    return channel.subject;
  };

  // Получаем инициалы пользователя
  const getUserInitials = (name: string) => {
    return name?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen">
      {/* Список чатов */}
      <div className="w-80 border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Поиск каналов"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-auto h-[calc(100vh-64px)]">
          <div className="p-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus size={18} className="mr-2" />
              Новый чат
            </Button>
          </div>

          <div className="space-y-1 p-2">
            {channelsLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Загрузка каналов...
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? "Каналы не найдены" : "Нет доступных каналов"}
              </div>
            ) : (
              filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer group ${
                    selectedChannelId === channel.id
                      ? "bg-secondary"
                      : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedChannelId(channel.id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                    channel.is_private
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {getChannelInitials(getChannelDisplayName(channel))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getChannelDisplayName(channel)}</p>
                    <p className="text-sm text-muted-foreground truncate">{getChannelDescription(channel)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-muted-foreground">
                      {formatTime(channel.updated_at)}
                    </div>
                    {user?.id === channel.admin_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChannel(channel.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Область чата */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedChannel.is_private
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {getChannelInitials(getChannelDisplayName(selectedChannel))}
                  </div>
                  <div>
                    <h2 className="font-medium">{getChannelDisplayName(selectedChannel)}</h2>
                    <p className="text-sm text-muted-foreground">{getChannelDescription(selectedChannel)}</p>
                  </div>
                </div>

                {/* Кнопка участников для групп */}
                {!selectedChannel.is_private && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGroupMembersDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Users size={16} />
                    Участники
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Загрузка сообщений...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <p>Пока нет сообщений в этом канале</p>
                    <p className="text-sm">Будьте первым, кто напишет сообщение!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwnMessage ? 'justify-end' : ''}`}
                    >
                      {!isOwnMessage && (
                        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs">
                          {getUserInitials(msg.profiles?.name || 'U')}
                        </div>
                      )}
                      <div className={isOwnMessage ? 'text-right' : ''}>
                        <div className={`flex items-baseline gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
                          {!isOwnMessage && (
                            <p className="font-medium">{msg.profiles?.name || 'Неизвестный пользователь'}</p>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                          {isOwnMessage && (
                            <p className="font-medium">Вы</p>
                          )}
                        </div>
                        <Card className={`p-3 mt-1 border-0 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                        }`}>
                          <p>{msg.content}</p>
                        </Card>
                      </div>
                      {isOwnMessage && (
                        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-xs text-primary-foreground">
                          {getUserInitials(user?.user_metadata?.name || 'Вы')}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Введите сообщение..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                  disabled={!selectedChannelId}
                />
                <Button type="submit" size="icon" disabled={!message.trim() || !selectedChannelId}>
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">Выберите канал для общения</p>
              <p>Выберите канал из списка слева или создайте новый</p>
            </div>
          </div>
        )}
      </div>

      {/* Диалог создания чата */}
      <CreateChatDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateChannel={handleCreateChannel}
        onCreateChatWithContact={handleCreateChatWithContact}
      />

      {/* Диалог участников группы */}
      {selectedChannel && !selectedChannel.is_private && (
        <GroupMembersDialog
          isOpen={showGroupMembersDialog}
          onClose={() => setShowGroupMembersDialog(false)}
          groupId={selectedChannel.id}
          groupName={selectedChannel.name}
        />
      )}
    </div>
  );
}

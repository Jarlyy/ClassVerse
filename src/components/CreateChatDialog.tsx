"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Users, MessageCircle, UserPlus } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { AddContactDialog } from "./AddContactDialog";

interface CreateChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, description?: string) => Promise<void>;
  onCreateChatWithContact: (contactId: string) => Promise<void>;
}

export function CreateChatDialog({ isOpen, onClose, onCreateChannel, onCreateChatWithContact }: CreateChatDialogProps) {
  const [chatType, setChatType] = useState<'channel' | 'contact' | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);

  const { contacts, loading: contactsLoading, refetch: refetchContacts } = useContacts();

  const resetForm = () => {
    setChatType(null);
    setName("");
    setDescription("");
    setError("");
    setShowAddContactDialog(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Название группы обязательно для заполнения");
      return;
    }

    try {
      setLoading(true);
      await onCreateChannel(name.trim(), description.trim() || undefined);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Ошибка при создании группы");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChatWithContact = async (contactId: string) => {
    try {
      setLoading(true);
      await onCreateChatWithContact(contactId);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Ошибка при создании чата");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContactClose = () => {
    setShowAddContactDialog(false);
    // Обновляем список контактов после добавления
    refetchContacts();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Новый чат</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X size={18} />
            </Button>
          </div>
          <CardDescription>
            Выберите тип чата для создания
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {!chatType && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => setChatType('channel')}
              >
                <Users size={24} />
                <div className="text-center">
                  <div className="font-medium">Группа</div>
                  <div className="text-sm text-muted-foreground">Создать группу для общения</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => setChatType('contact')}
              >
                <MessageCircle size={24} />
                <div className="text-center">
                  <div className="font-medium">Личный чат</div>
                  <div className="text-sm text-muted-foreground">Начать чат с контактом</div>
                </div>
              </Button>
            </div>
          )}

          {chatType === 'channel' && (
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Название группы *
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Например: Математика 11А"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Описание (необязательно)
                </label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Краткое описание группы"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setChatType(null)} className="flex-1">
                  Назад
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Создание..." : "Создать"}
                </Button>
              </div>
            </form>
          )}

          {chatType === 'contact' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Выберите контакт для чата
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddContactDialog(true)}
                    className="flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    Добавить контакт
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Вы можете создать чат только с добавленными контактами
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {contactsLoading && (
                  <div className="text-center text-muted-foreground py-4">
                    Загрузка контактов...
                  </div>
                )}

                {!contactsLoading && contacts.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                    <p>У вас пока нет контактов</p>
                    <p className="text-xs">Нажмите "Добавить контакт" выше, чтобы найти пользователей</p>
                  </div>
                )}

                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                        {contact.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={contact.has_chat ? "outline" : "default"}
                      onClick={() => handleCreateChatWithContact(contact.id)}
                      disabled={loading}
                    >
                      {contact.has_chat ? "Открыть" : "Начать чат"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setChatType(null)} className="flex-1">
                  Назад
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог добавления контакта */}
      <AddContactDialog
        isOpen={showAddContactDialog}
        onClose={handleAddContactClose}
      />
    </div>
  );
}

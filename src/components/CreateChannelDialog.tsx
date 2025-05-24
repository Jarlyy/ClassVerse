"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, subject: string, description?: string) => Promise<void>;
}

export function CreateChannelDialog({ isOpen, onClose, onCreateChannel }: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !subject.trim()) {
      setError("Название и предмет обязательны для заполнения");
      return;
    }

    try {
      setLoading(true);
      await onCreateChannel(name.trim(), subject.trim(), description.trim() || undefined);

      // Очищаем форму и закрываем диалог
      setName("");
      setSubject("");
      setDescription("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Ошибка при создании чата");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Создать новый чат</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
          <CardDescription>
            Создайте чат для общения по определенному предмету
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Название чата *
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
              <label htmlFor="subject" className="text-sm font-medium">
                Предмет *
              </label>
              <Input
                id="subject"
                type="text"
                placeholder="Например: Математика"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
                placeholder="Краткое описание чата"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Создание..." : "Создать"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useHomework, CreateHomeworkData } from "@/hooks/useHomework";
import { toast } from "sonner";

interface AddHomeworkDialogProps {
  onSuccess?: () => void;
}

export function AddHomeworkDialog({ onSuccess }: AddHomeworkDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateHomeworkData>({
    subject: "",
    task: "",
    due_date: ""
  });

  const { createHomework, saving } = useHomework();

  // Получаем завтрашнюю дату как минимальную дату
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.task.trim() || !formData.due_date) {
      toast.error("Пожалуйста, заполните все поля");
      return;
    }

    try {
      await createHomework(formData);

      toast.success("Домашнее задание добавлено");

      // Сброс формы
      setFormData({
        subject: "",
        task: "",
        due_date: ""
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Не удалось добавить домашнее задание");
    }
  };

  const handleInputChange = (field: keyof CreateHomeworkData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={18} className="mr-2" />
          Добавить задание
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить домашнее задание</DialogTitle>
          <DialogDescription>
            Создайте новое домашнее задание для класса
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Предмет</Label>
            <Input
              id="subject"
              placeholder="Например: Математика"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task">Описание задания</Label>
            <Textarea
              id="task"
              placeholder="Опишите домашнее задание..."
              value={formData.task}
              onChange={(e) => handleInputChange("task", e.target.value)}
              disabled={saving}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Срок выполнения</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange("due_date", e.target.value)}
              disabled={saving}
              min={getTomorrowDate()}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

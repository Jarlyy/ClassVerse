"use client";

import { useState } from "react";
import { MoreVertical, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatMenuProps {
  isPrivateChat: boolean;
  onDeleteChat: (deleteForBoth: boolean) => void;
  onClearHistory: () => void;
}

export function ChatMenu({ isPrivateChat, onDeleteChat, onClearHistory }: ChatMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  const handleDeleteConfirm = (deleteForBoth: boolean) => {
    onDeleteChat(deleteForBoth);
    setShowDeleteDialog(false);
  };

  const handleClearConfirm = () => {
    onClearHistory();
    setShowClearDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleClearClick}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Очистить историю
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить чат
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог удаления чата */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить чат</AlertDialogTitle>
            <AlertDialogDescription>
              {isPrivateChat 
                ? "Выберите, как удалить этот чат:"
                : "Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isPrivateChat ? (
              <>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteConfirm(false)}
                  variant="outline"
                >
                  Только для меня
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleDeleteConfirm(true)}
                  variant="destructive"
                >
                  Для обеих сторон
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteConfirm(true)}
                  variant="destructive"
                >
                  Удалить
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог очистки истории */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить историю чата</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите очистить историю этого чата? 
              Сообщения будут удалены только для вас. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirm}
              variant="destructive"
            >
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

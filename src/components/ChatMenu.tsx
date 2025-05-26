"use client";

import { useState } from "react";
import { MoreVertical, Trash2, RotateCcw, UserMinus } from "lucide-react";
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
  isGroupChat?: boolean;
  isUserGroupAdmin?: boolean;
  onDeleteChat: (deleteForBoth: boolean) => void;
  onClearHistory: () => void;
  onLeaveGroup?: () => void;
}

export function ChatMenu({
  isPrivateChat,
  isGroupChat = false,
  isUserGroupAdmin = false,
  onDeleteChat,
  onClearHistory,
  onLeaveGroup
}: ChatMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  const handleLeaveClick = () => {
    setShowLeaveDialog(true);
  };

  const handleDeleteConfirm = (deleteForBoth: boolean) => {
    onDeleteChat(deleteForBoth);
    setShowDeleteDialog(false);
  };

  const handleClearConfirm = () => {
    onClearHistory();
    setShowClearDialog(false);
  };

  const handleLeaveConfirm = () => {
    if (onLeaveGroup) {
      onLeaveGroup();
    }
    setShowLeaveDialog(false);
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

          {/* Для групп: показываем "Выйти из группы" для обычных участников или "Удалить группу" для админов */}
          {isGroupChat ? (
            isUserGroupAdmin ? (
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить группу
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleLeaveClick}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Выйти из группы
              </DropdownMenuItem>
            )
          ) : (
            /* Для личных чатов: показываем "Удалить чат" */
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить чат
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог удаления чата */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isGroupChat ? "Удалить группу" : "Удалить чат"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPrivateChat
                ? "Выберите, как удалить этот чат:"
                : isGroupChat
                ? "Вы уверены, что хотите удалить эту группу? Все сообщения будут удалены для всех участников. Это действие нельзя отменить."
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
                  {isGroupChat ? "Удалить группу" : "Удалить"}
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
              {isPrivateChat
                ? "Сообщения будут удалены только для вас."
                : "Сообщения будут удалены для всех участников группы."
              } Это действие нельзя отменить.
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

      {/* Диалог выхода из группы */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из группы</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите покинуть эту группу? Вы больше не сможете видеть сообщения и участвовать в обсуждениях.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveConfirm}
              variant="destructive"
            >
              Выйти из группы
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

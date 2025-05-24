"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, UserPlus, Search, Check } from "lucide-react";
import { useContacts, UserToAdd } from "@/hooks/useContacts";

interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddContactDialog({ isOpen, onClose }: AddContactDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserToAdd[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");

  const { searchUsers, addContact } = useContacts();

  const resetForm = () => {
    setSearchTerm("");
    setUsers([]);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    setError("");
    
    if (value.length >= 2) {
      try {
        setSearchLoading(true);
        const results = await searchUsers(value);
        setUsers(results);
      } catch (err: any) {
        setError('Ошибка при поиске пользователей');
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setUsers([]);
    }
  };

  const handleAddContact = async (userId: string) => {
    try {
      setLoading(true);
      setError("");
      
      await addContact(userId);
      
      // Обновляем список пользователей, чтобы показать, что контакт добавлен
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_contact: true } : user
      ));
      
    } catch (err: any) {
      setError(err.message || "Ошибка при добавлении контакта");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={20} />
              Добавить контакт
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X size={18} />
            </Button>
          </div>
          <CardDescription>
            Найдите пользователя и добавьте его в контакты
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Поиск пользователя
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="search"
                type="text"
                placeholder="Введите имя или email"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Введите минимум 2 символа для поиска
            </p>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searchLoading && (
              <div className="text-center text-muted-foreground py-4">
                Поиск пользователей...
              </div>
            )}
            
            {!searchLoading && searchTerm.length >= 2 && users.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Пользователи не найдены
              </div>
            )}
            
            {searchTerm.length < 2 && (
              <div className="text-center text-muted-foreground py-8">
                <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                <p>Начните вводить имя или email</p>
                <p className="text-xs">для поиска пользователей</p>
              </div>
            )}
            
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                    {user.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                
                {user.is_contact ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Check size={16} />
                    В контактах
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAddContact(user.id)}
                    disabled={loading}
                  >
                    Добавить
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>
              Закрыть
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

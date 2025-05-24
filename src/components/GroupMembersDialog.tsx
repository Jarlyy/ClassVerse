"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, UserPlus, Search, Crown, UserMinus } from "lucide-react";
import { useGroups, GroupMember, UserForGroup } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";

interface GroupMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function GroupMembersDialog({ isOpen, onClose, groupId, groupName }: GroupMembersDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserForGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddMode, setShowAddMode] = useState(false);

  const { user } = useAuth();
  const { getGroupMembers, getAvailableUsers, addGroupMember, removeGroupMember } = useGroups();

  const resetForm = () => {
    setSearchTerm("");
    setSearchResults([]);
    setError("");
    setShowAddMode(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const membersData = await getGroupMembers(groupId);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Ошибка при загрузке участников");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    setError("");

    // Фильтруем пользователей локально
    if (searchResults.length > 0) {
      // Если у нас уже есть список пользователей, фильтруем его
      return;
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      setLoading(true);
      setError("");

      await addGroupMember(groupId, userId);

      // Обновляем список участников
      await fetchMembers();

      // Обновляем список доступных пользователей
      await loadAvailableUsers();

    } catch (err: any) {
      setError(err.message || "Ошибка при добавлении участника");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого участника из группы?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      await removeGroupMember(groupId, userId);

      // Обновляем список участников
      await fetchMembers();

    } catch (err: any) {
      setError(err.message || "Ошибка при удалении участника");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setSearchLoading(true);
      const allUsers = await getAvailableUsers();

      // Отмечаем пользователей, которые уже являются участниками
      const usersWithMemberStatus = allUsers.map(user => ({
        ...user,
        is_member: members.some(member => member.user_id === user.user_id)
      }));

      setSearchResults(usersWithMemberStatus);
    } catch (err: any) {
      setError('Ошибка при загрузке пользователей');
      console.error('Load users error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    if (showAddMode && members.length > 0) {
      loadAvailableUsers();
    }
  }, [showAddMode, members]);

  if (!isOpen) return null;

  const currentUserIsAdmin = members.find(m => m.user_id === user?.id)?.is_admin || false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Crown size={20} />
              Участники группы
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X size={18} />
            </Button>
          </div>
          <CardDescription>
            Группа: {groupName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {!showAddMode && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Участники ({members.length})</h3>
                {currentUserIsAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMode(true)}
                    className="flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    Добавить
                  </Button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {loading && (
                  <div className="text-center text-muted-foreground py-4">
                    Загрузка участников...
                  </div>
                )}

                {!loading && members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                        {member.user_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{member.user_name}</p>
                          {member.is_admin && (
                            <Crown size={14} className="text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.user_email}</p>
                      </div>
                    </div>

                    {currentUserIsAdmin && !member.is_admin && member.user_id !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={loading}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {showAddMode && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Добавить пользователей</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMode(false)}
                >
                  Назад
                </Button>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    type="text"
                    placeholder="Введите имя или email"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Поиск среди всех пользователей системы.
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {searchLoading && (
                  <div className="text-center text-muted-foreground py-4">
                    Загрузка пользователей...
                  </div>
                )}

                {!searchLoading && searchResults.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Пользователи не найдены</p>
                    <p className="text-xs">
                      В системе пока нет других пользователей для добавления в группу
                    </p>
                  </div>
                )}

                {searchResults
                  .filter(user =>
                    searchTerm.length === 0 ||
                    user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.user_email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                        {user.user_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.user_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.user_email}</p>
                      </div>
                    </div>

                    {user.is_member ? (
                      <div className="text-sm text-muted-foreground">
                        Уже участник
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(user.user_id)}
                        disabled={loading}
                      >
                        Добавить
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

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

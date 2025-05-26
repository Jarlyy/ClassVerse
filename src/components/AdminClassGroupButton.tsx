"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { supabase } from "@/lib/supabase/client";

interface AdminClassGroupButtonProps {
  onGroupCreated: () => Promise<void>;
}

interface ClassInfo {
  class_name: string;
  student_count: number;
  has_group: boolean;
}

export function AdminClassGroupButton({ onGroupCreated }: AdminClassGroupButtonProps) {
  const { user } = useAuth();
  const { createClassGroup, loading } = useGroups();
  const [isAdmin, setIsAdmin] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [showClassList, setShowClassList] = useState(false);

  // Проверяем, является ли пользователь администратором
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          return;
        }

        setIsAdmin(profile?.role === 'admin');
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Получаем список классов
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('class_name')
        .not('class_name', 'is', null)
        .neq('class_name', '');

      if (error) throw error;

      // Группируем по классам и считаем количество учеников
      const classMap = new Map<string, number>();
      data?.forEach(profile => {
        if (profile.class_name) {
          classMap.set(profile.class_name, (classMap.get(profile.class_name) || 0) + 1);
        }
      });

      // Проверяем, какие классы уже имеют группы
      const { data: existingGroups, error: groupsError } = await supabase
        .from('channels')
        .select('name')
        .eq('is_class_group', true);

      if (groupsError) throw groupsError;

      const existingGroupNames = new Set(existingGroups?.map(g => g.name) || []);

      const classInfos: ClassInfo[] = Array.from(classMap.entries()).map(([className, count]) => ({
        class_name: className,
        student_count: count,
        has_group: existingGroupNames.has(className)
      }));

      setClasses(classInfos.sort((a, b) => a.class_name.localeCompare(b.class_name)));
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleCreateClassGroup = async (className: string) => {
    try {
      await createClassGroup(className);
      await onGroupCreated();
      await fetchClasses(); // Обновляем список классов
      setShowClassList(false);
    } catch (err: any) {
      console.error('Error creating class group:', err);
      alert(err.message || 'Ошибка при создании группы класса');
    }
  };

  const handleButtonClick = async () => {
    if (!showClassList) {
      await fetchClasses();
    }
    setShowClassList(!showClassList);
  };

  // Не показываем кнопку, если пользователь не администратор
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={handleButtonClick}
        disabled={loading}
      >
        <GraduationCap size={18} className="mr-2" />
        {showClassList ? 'Скрыть классы' : 'Группы классов'}
      </Button>

      {showClassList && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">
              Создание групп для классов
            </div>
            {classes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Нет доступных классов
              </div>
            ) : (
              classes.map((classInfo) => (
                <div
                  key={classInfo.class_name}
                  className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{classInfo.class_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {classInfo.student_count} учеников
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={classInfo.has_group ? "outline" : "default"}
                    onClick={() => handleCreateClassGroup(classInfo.class_name)}
                    disabled={loading || classInfo.has_group}
                    className="ml-2"
                  >
                    {classInfo.has_group ? (
                      "Создана"
                    ) : (
                      <>
                        <Plus size={14} className="mr-1" />
                        Создать
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

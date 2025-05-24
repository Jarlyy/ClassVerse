"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { Settings, User, Save, Loader2 } from "lucide-react";

interface UserProfile {
  user_id: string;
  user_name: string;
  user_email: string;
  user_class_name: string;
  user_bio: string;
  user_avatar_url: string;
  user_role: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Форма настроек
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [bio, setBio] = useState("");

  // Загрузка профиля пользователя
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_current_user_profile');

        if (error) throw error;

        if (data && data.length > 0) {
          const profileData = data[0];
          setProfile(profileData);
          setName(profileData.user_name || "");
          setClassName(profileData.user_class_name || "");
          setBio(profileData.user_bio || "");
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError("Ошибка при загрузке профиля");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Сохранение изменений
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Имя не может быть пустым");
      return;
    }

    if (!className.trim()) {
      setError("Класс не может быть пустым");
      return;
    }

    try {
      setSaving(true);
      
      const { data, error } = await supabase.rpc('update_user_profile', {
        new_name: name.trim(),
        new_class_name: className.trim(),
        new_bio: bio.trim() || null,
        new_avatar_url: null // Пока не реализовано
      });

      if (error) throw error;

      setSuccess("Настройки успешно сохранены!");
      
      // Обновляем локальное состояние
      if (profile) {
        setProfile({
          ...profile,
          user_name: name.trim(),
          user_class_name: className.trim(),
          user_bio: bio.trim(),
        });
      }

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError("Ошибка при сохранении настроек");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Загрузка настроек...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Settings size={24} />
          <h1 className="text-2xl font-bold">Настройки</h1>
        </div>

        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Профиль пользователя
            </CardTitle>
            <CardDescription>
              Управляйте своей основной информацией
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Имя и фамилия
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Иван Иванов"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.user_email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email нельзя изменить
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="className" className="text-sm font-medium">
                  Класс
                </label>
                <Input
                  id="className"
                  type="text"
                  placeholder="11А, 9Б, 10В..."
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="bio" className="text-sm font-medium">
                  О себе
                </label>
                <Textarea
                  id="bio"
                  placeholder="Расскажите немного о себе..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Максимум 500 символов
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Роль
                </label>
                <Input
                  value={profile?.user_role === 'student' ? 'Ученик' : 
                         profile?.user_role === 'teacher' ? 'Учитель' : 'Администратор'}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Роль назначается администратором
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Сохранение..." : "Сохранить изменения"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setName(profile?.user_name || "");
                    setClassName(profile?.user_class_name || "");
                    setBio(profile?.user_bio || "");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Отменить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Информация об аккаунте */}
        <Card>
          <CardHeader>
            <CardTitle>Информация об аккаунте</CardTitle>
            <CardDescription>
              Дополнительная информация о вашем аккаунте
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Дата регистрации:</span>
              <span className="text-sm">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Последнее обновление:</span>
              <span className="text-sm">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ID пользователя:</span>
              <span className="text-sm font-mono">{profile?.user_id}</span>
            </div>
          </CardContent>
        </Card>

        {/* Действия с аккаунтом */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Опасная зона</CardTitle>
            <CardDescription>
              Действия, которые нельзя отменить
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={signOut}
              className="w-full"
            >
              Выйти из аккаунта
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

-- Политики безопасности для таблицы channels

-- Включаем RLS для таблицы channels (если еще не включено)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can view all channels" ON channels;
DROP POLICY IF EXISTS "Users can create channels" ON channels;
DROP POLICY IF EXISTS "Users can update their own channels" ON channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON channels;

-- Политика для просмотра каналов (все пользователи могут видеть все каналы)
CREATE POLICY "Users can view all channels" ON channels
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Политика для создания каналов (аутентифицированные пользователи могут создавать каналы)
CREATE POLICY "Users can create channels" ON channels
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = admin_id);

-- Политика для обновления каналов (только админ канала может обновлять)
CREATE POLICY "Users can update their own channels" ON channels
    FOR UPDATE
    USING (auth.uid() = admin_id)
    WITH CHECK (auth.uid() = admin_id);

-- Политика для удаления каналов (только админ канала может удалять)
CREATE POLICY "Users can delete their own channels" ON channels
    FOR DELETE
    USING (auth.uid() = admin_id);

-- Политики безопасности для таблицы messages

-- Включаем RLS для таблицы messages (если еще не включено)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can view all messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Политика для просмотра сообщений (все пользователи могут видеть все сообщения)
CREATE POLICY "Users can view all messages" ON messages
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Политика для создания сообщений (аутентифицированные пользователи могут создавать сообщения)
CREATE POLICY "Users can create messages" ON messages
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Политика для обновления сообщений (только автор может обновлять свои сообщения)
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Политика для удаления сообщений (только автор может удалять свои сообщения)
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE
    USING (auth.uid() = user_id);

-- Политики безопасности для таблицы profiles

-- Включаем RLS для таблицы profiles (если еще не включено)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Политика для просмотра профилей (все пользователи могут видеть все профили)
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Политика для создания профиля (пользователи могут создавать только свой профиль)
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Политика для обновления профиля (пользователи могут обновлять только свой профиль)
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Создаем функцию для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем существующий триггер (если есть)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создаем триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Проверяем, что все работает корректно
SELECT 'RLS policies created successfully' as status;

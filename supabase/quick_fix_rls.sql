-- Быстрое исправление RLS политик для разработки
-- ВНИМАНИЕ: Это упрощенные политики для разработки, в продакшене нужны более строгие правила

-- Отключаем RLS временно для настройки
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Enable read access for all users" ON channels;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON channels;
DROP POLICY IF EXISTS "Enable update for users based on admin_id" ON channels;
DROP POLICY IF EXISTS "Enable delete for users based on admin_id" ON channels;

DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON messages;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON messages;

DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Включаем RLS обратно
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Создаем простые политики для channels
CREATE POLICY "Enable read access for all users" ON channels
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON channels
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on admin_id" ON channels
    FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Enable delete for users based on admin_id" ON channels
    FOR DELETE USING (auth.uid() = admin_id);

-- Создаем простые политики для messages
CREATE POLICY "Enable read access for all users" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON messages
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем простые политики для profiles
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for users based on user_id" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Проверяем текущего пользователя
SELECT 
    'Current user: ' || COALESCE(auth.uid()::text, 'not authenticated') as status,
    'Role: ' || COALESCE(auth.role(), 'none') as role;

-- Показываем существующих пользователей
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'name' as name
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

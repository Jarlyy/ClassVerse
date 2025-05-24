-- Быстрое исправление проблемы с поиском пользователей

-- 1. Проверяем структуру таблицы profiles
SELECT 'Current profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Добавляем недостающие колонки, если их нет
DO $$
BEGIN
    -- Добавляем email, если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Колонка email добавлена в profiles';
    END IF;
    
    -- Добавляем avatar_url, если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Колонка avatar_url добавлена в profiles';
    END IF;
END $$;

-- 3. Обновляем email для существующих профилей из auth.users
UPDATE profiles 
SET email = u.email
FROM auth.users u
WHERE profiles.id = u.id 
AND profiles.email IS NULL;

-- 4. Создаем простую функцию поиска пользователей
CREATE OR REPLACE FUNCTION search_users_for_chat(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    has_existing_chat BOOLEAN
) AS $$
BEGIN
    -- Проверяем аутентификацию
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        COALESCE(p.email, '') as email,
        FALSE as has_existing_chat
    FROM profiles p
    WHERE p.id != auth.uid()
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Проверяем RLS политики для profiles
DO $$
BEGIN
    -- Включаем RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    -- Удаляем старые политики
    DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    
    -- Создаем политику для чтения
    CREATE POLICY "Allow authenticated users to read all profiles" ON profiles
        FOR SELECT
        USING (auth.role() = 'authenticated');
        
    RAISE NOTICE 'RLS политики обновлены';
END $$;

-- 6. Создаем тестовые профили, если их мало
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    IF profile_count < 3 THEN
        INSERT INTO profiles (id, name, email) VALUES
        (gen_random_uuid(), 'Анна Иванова', 'anna@example.com'),
        (gen_random_uuid(), 'Петр Петров', 'petr@example.com'),
        (gen_random_uuid(), 'Мария Сидорова', 'maria@example.com')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Тестовые профили добавлены';
    END IF;
END $$;

-- 7. Тестируем функцию поиска
SELECT 'Testing search function:' as info;
SELECT * FROM search_users_for_chat('ан') LIMIT 3;

-- 8. Показываем итоговую статистику
SELECT 'Final status:' as info;
SELECT 
    'Profiles count: ' || COUNT(*) as status
FROM profiles;

SELECT 'Search function exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'search_users_for_chat'
    ) THEN 'YES' ELSE 'NO' END as status;

-- Скрипт для отладки проблем с пользователями

-- 1. Проверяем существующих пользователей
SELECT 'Existing users in auth.users:' as info;
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'name' as name
FROM auth.users
ORDER BY created_at DESC;

-- 2. Проверяем профили пользователей
SELECT 'Existing profiles:' as info;
SELECT 
    id,
    name,
    email,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Проверяем, существует ли функция поиска
SELECT 'Checking if search function exists:' as info;
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'search_users_for_chat';

-- 4. Проверяем политики RLS для profiles
SELECT 'RLS policies for profiles:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Создаем тестовых пользователей в profiles (если их нет)
-- ВНИМАНИЕ: Это только для тестирования!
DO $$
DECLARE
    test_user_count INTEGER;
BEGIN
    -- Проверяем количество профилей
    SELECT COUNT(*) INTO test_user_count FROM profiles;
    
    IF test_user_count < 3 THEN
        -- Создаем тестовые профили (только если их мало)
        INSERT INTO profiles (id, name, email) VALUES
        (gen_random_uuid(), 'Анна Иванова', 'anna.ivanova@example.com'),
        (gen_random_uuid(), 'Петр Петров', 'petr.petrov@example.com'),
        (gen_random_uuid(), 'Мария Сидорова', 'maria.sidorova@example.com'),
        (gen_random_uuid(), 'Алексей Козлов', 'alexey.kozlov@example.com'),
        (gen_random_uuid(), 'Елена Смирнова', 'elena.smirnova@example.com')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Тестовые профили добавлены';
    ELSE
        RAISE NOTICE 'Профили уже существуют: %', test_user_count;
    END IF;
END $$;

-- 6. Тестируем функцию поиска (если она существует)
DO $$
BEGIN
    BEGIN
        PERFORM search_users_for_chat('ан');
        RAISE NOTICE 'Функция search_users_for_chat работает';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Функция search_users_for_chat не работает: %', SQLERRM;
    END;
END $$;

-- 7. Тестируем прямой запрос к profiles
SELECT 'Testing direct profiles query:' as info;
SELECT 
    id,
    name,
    email
FROM profiles
WHERE name ILIKE '%ан%' OR email ILIKE '%ан%'
LIMIT 5;

-- 8. Проверяем текущего пользователя
SELECT 'Current user info:' as info;
SELECT 
    COALESCE(auth.uid()::text, 'not authenticated') as current_user_id,
    COALESCE(auth.role(), 'none') as current_role;

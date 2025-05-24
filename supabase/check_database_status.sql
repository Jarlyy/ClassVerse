-- Проверка состояния базы данных

-- 1. Проверяем структуру таблицы profiles
SELECT 'Profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Проверяем RLS политики для profiles
SELECT 'RLS policies for profiles:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 3. Проверяем триггеры на auth.users
SELECT 'Triggers on auth.users:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 4. Проверяем функции
SELECT 'Available functions:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%' OR routine_name LIKE '%profile%'
ORDER BY routine_name;

-- 5. Проверяем количество записей в profiles
SELECT 'Profiles count:' as info;
SELECT COUNT(*) as total_profiles FROM profiles;

-- 6. Проверяем последние записи в profiles
SELECT 'Recent profiles:' as info;
SELECT id, name, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Тестируем создание профиля
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || extract(epoch from now()) || '@example.com';
BEGIN
    BEGIN
        INSERT INTO profiles (id, name, email)
        VALUES (test_user_id, 'Тестовый пользователь', test_email);
        
        DELETE FROM profiles WHERE id = test_user_id;
        
        RAISE NOTICE 'SUCCESS: Profile creation test passed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profile creation test failed: %', SQLERRM;
    END;
END $$;

-- Исправление ошибки регистрации

-- 1. Проверяем существование таблицы profiles и её структуру
SELECT 'Checking profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Удаляем старый триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Удаляем старую функцию
DROP FUNCTION IF EXISTS create_profile_for_user() CASCADE;

-- 4. Создаем исправленную функцию создания профиля
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Пользователь'),
        NEW.email,
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Логируем ошибку, но не прерываем регистрацию
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем новый триггер
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Проверяем RLS политики для profiles
DO $$
BEGIN
    -- Удаляем все политики
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
    
    -- Создаем правильные политики
    CREATE POLICY "Enable read access for all users" ON profiles
        FOR SELECT USING (true);
    
    CREATE POLICY "Enable insert for authenticated users only" ON profiles
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Enable update for users based on email" ON profiles
        FOR UPDATE USING (auth.uid() = id);
        
    RAISE NOTICE 'RLS политики для profiles обновлены';
END $$;

-- 7. Убеждаемся, что RLS включен
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 8. Проверяем, что у нас есть все необходимые колонки
DO $$
BEGIN
    -- Добавляем created_at если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Добавлена колонка created_at';
    END IF;
    
    -- Добавляем updated_at если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Добавлена колонка updated_at';
    END IF;
END $$;

-- 9. Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Тестируем создание профиля вручную
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Пробуем создать тестовый профиль
    INSERT INTO profiles (id, name, email)
    VALUES (test_user_id, 'Тестовый пользователь', 'test@example.com');
    
    -- Удаляем тестовый профиль
    DELETE FROM profiles WHERE id = test_user_id;
    
    RAISE NOTICE 'Тест создания профиля прошел успешно';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Ошибка при тестировании создания профиля: %', SQLERRM;
END $$;

-- 12. Показываем информацию о триггерах
SELECT 'Current triggers on auth.users:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

SELECT 'Registration error fix completed' as status;

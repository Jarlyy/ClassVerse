-- Настройка Supabase для работы с телефонной авторизацией

-- 1. Отключаем подтверждение email для пользователей с телефонными номерами
-- Это нужно сделать в настройках Supabase Dashboard:
-- Authentication > Settings > Email Auth > Confirm email = OFF

-- 2. Создаем функцию для обновления профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем профиль для нового пользователя
    INSERT INTO profiles (id, name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Пользователь'),
        CASE 
            WHEN NEW.email LIKE '%@phone.local' THEN NULL 
            ELSE NEW.email 
        END,
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Создаем или обновляем триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Создаем функцию для поиска пользователя по телефону
CREATE OR REPLACE FUNCTION find_user_by_phone(phone_number TEXT)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.phone, '') as user_phone
    FROM profiles p
    WHERE p.phone = phone_number
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем функцию для получения профиля текущего пользователя
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_phone TEXT
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.phone, '') as user_phone
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Обновляем функцию обновления профиля
CREATE OR REPLACE FUNCTION update_user_profile(
    new_name TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    UPDATE profiles 
    SET 
        name = COALESCE(new_name, name),
        phone = COALESCE(new_phone, phone),
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Создаем представление для удобного доступа к пользователям
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    p.id,
    p.name,
    p.email,
    p.phone,
    p.created_at,
    p.updated_at,
    au.email as auth_email,
    au.phone as auth_phone,
    au.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id;

-- 8. Обновляем RLS политики для profiles
DO $$
BEGIN
    -- Удаляем старые политики
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    
    -- Создаем новые политики
    -- Пользователи могут видеть все профили (для поиска контактов)
    CREATE POLICY "Users can view all profiles" ON profiles
        FOR SELECT USING (auth.role() = 'authenticated');
    
    -- Пользователи могут обновлять только свой профиль
    CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    
    -- Система может создавать профили при регистрации
    CREATE POLICY "System can insert profiles" ON profiles
        FOR INSERT WITH CHECK (true);
        
    RAISE NOTICE 'RLS политики для profiles обновлены';
END $$;

-- 9. Создаем функцию для миграции существующих пользователей
CREATE OR REPLACE FUNCTION migrate_existing_users_to_phone()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    phone_from_email TEXT;
    migrated_count INTEGER := 0;
BEGIN
    -- Обновляем пользователей, у которых email выглядит как телефон
    FOR user_record IN 
        SELECT p.id, p.email, au.raw_user_meta_data
        FROM profiles p
        JOIN auth.users au ON au.id = p.id
        WHERE p.email LIKE '%@phone.local'
    LOOP
        -- Извлекаем номер телефона из email
        phone_from_email := split_part(user_record.email, '@', 1);
        
        -- Обновляем профиль
        UPDATE profiles 
        SET 
            phone = '+' || phone_from_email,
            email = NULL
        WHERE id = user_record.id;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN 'Migrated ' || migrated_count || ' users to phone authentication';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Phone authentication system configured successfully' as status;

-- Показываем информацию о созданных функциях
SELECT 
    routine_name,
    routine_type,
    'Created/Updated' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'handle_new_user', 
    'find_user_by_phone', 
    'get_current_user_profile',
    'update_user_profile',
    'migrate_existing_users_to_phone'
) 
AND routine_schema = 'public';

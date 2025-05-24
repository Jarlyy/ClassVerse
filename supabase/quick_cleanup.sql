-- Быстрая очистка от телефонной авторизации

-- 1. Удаляем триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Удаляем функции с CASCADE (принудительно)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS find_user_by_phone(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_profile() CASCADE;
DROP FUNCTION IF EXISTS update_user_profile(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS migrate_existing_users_to_phone() CASCADE;

-- 3. Удаляем представление
DROP VIEW IF EXISTS user_profiles CASCADE;

-- 4. Удаляем колонку phone
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        DROP INDEX IF EXISTS profiles_phone_unique;
        ALTER TABLE profiles DROP COLUMN phone;
        RAISE NOTICE 'Колонка phone удалена';
    END IF;
END $$;

-- 5. Восстанавливаем NOT NULL для email
DO $$
BEGIN
    -- Удаляем записи с NULL email
    DELETE FROM profiles WHERE email IS NULL;
    -- Восстанавливаем NOT NULL
    ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
    RAISE NOTICE 'NOT NULL для email восстановлен';
END $$;

-- 6. Восстанавливаем базовую функцию создания профиля
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Пользователь'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Восстанавливаем триггер
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

SELECT 'Quick cleanup completed' as status;

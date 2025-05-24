-- Исправление RLS политик для таблицы profiles

-- Проверяем и создаем/обновляем таблицу profiles
DO $$
BEGIN
    -- Проверяем, существует ли таблица profiles
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Создаем таблицу profiles, если её нет
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        RAISE NOTICE 'Таблица profiles создана';
    ELSE
        RAISE NOTICE 'Таблица profiles уже существует';

        -- Проверяем и добавляем недостающие колонки
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
            ALTER TABLE profiles ADD COLUMN email TEXT;
            RAISE NOTICE 'Колонка email добавлена';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
            ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
            RAISE NOTICE 'Колонка avatar_url добавлена';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
            ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Колонка created_at добавлена';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
            ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Колонка updated_at добавлена';
        END IF;
    END IF;
END $$;

-- Включаем RLS для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики для profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Создаем простые политики для profiles
-- Все аутентифицированные пользователи могут читать все профили
CREATE POLICY "Allow authenticated users to read all profiles" ON profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Пользователи могут создавать только свой профиль
CREATE POLICY "Allow users to insert their own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Allow users to update their own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Создаем или обновляем функцию для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    email = new.email,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем существующий триггер и создаем новый
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Создаем упрощенную функцию поиска пользователей
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
        p.email,
        FALSE as has_existing_chat -- Упрощенная версия, не проверяем существующие чаты
    FROM profiles p
    WHERE p.id != auth.uid()
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        p.email ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем профили для существующих пользователей auth.users (если их нет)
DO $$
BEGIN
    -- Проверяем, есть ли колонка email в profiles
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        -- Если есть колонка email
        INSERT INTO profiles (id, name, email)
        SELECT
            u.id,
            COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
            u.email
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- Если нет колонки email
        INSERT INTO profiles (id, name)
        SELECT
            u.id,
            COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Профили для существующих пользователей созданы';
END $$;

-- Создаем функцию для добавления контакта (создания личного чата)
CREATE OR REPLACE FUNCTION create_private_chat(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    existing_chat_id UUID;
    new_chat_id UUID;
    other_user_name TEXT;
BEGIN
    -- Получаем ID текущего пользователя
    current_user_id := auth.uid();

    -- Проверяем, что пользователь аутентифицирован
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, что это не чат с самим собой
    IF current_user_id = other_user_id THEN
        RAISE EXCEPTION 'Cannot create chat with yourself';
    END IF;

    -- Проверяем, существует ли уже чат между этими пользователями
    SELECT id INTO existing_chat_id
    FROM channels
    WHERE is_private = true
    AND participant_ids @> ARRAY[current_user_id, other_user_id]
    AND array_length(participant_ids, 1) = 2;

    -- Если чат уже существует, возвращаем его ID
    IF existing_chat_id IS NOT NULL THEN
        RETURN existing_chat_id;
    END IF;

    -- Получаем имя другого пользователя
    SELECT name INTO other_user_name
    FROM profiles
    WHERE id = other_user_id;

    -- Если имя не найдено, используем email
    IF other_user_name IS NULL THEN
        SELECT split_part(email, '@', 1) INTO other_user_name
        FROM auth.users
        WHERE id = other_user_id;
    END IF;

    -- Создаем новый личный чат
    INSERT INTO channels (
        name,
        subject,
        description,
        admin_id,
        is_private,
        participant_ids
    ) VALUES (
        'Личный чат с ' || COALESCE(other_user_name, 'пользователем'),
        'Личное общение',
        'Личный чат между двумя пользователями',
        current_user_id,
        true,
        ARRAY[current_user_id, other_user_id]
    ) RETURNING id INTO new_chat_id;

    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем результат
SELECT 'Setup completed. Current profiles count:' as info, COUNT(*) as count FROM profiles;

-- Проверяем, что все функции созданы
SELECT 'Functions created:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('search_users_for_chat', 'create_private_chat', 'handle_new_user')
AND routine_schema = 'public';

-- Добавление поля "класс" и настроек профиля (исправленная версия)

-- 1. Добавляем колонки в таблицу profiles
DO $$
BEGIN
    -- Добавляем колонку class_name, если её нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'class_name') THEN
        ALTER TABLE profiles ADD COLUMN class_name TEXT;
        RAISE NOTICE 'Колонка class_name добавлена в profiles';
    END IF;
    
    -- Добавляем колонку bio для описания пользователя
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Колонка bio добавлена в profiles';
    END IF;
    
    -- Добавляем колонку avatar_url для аватара
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Колонка avatar_url добавлена в profiles';
    END IF;
    
    -- Добавляем колонку role для роли пользователя (student, teacher, admin)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'student';
        RAISE NOTICE 'Колонка role добавлена в profiles';
    END IF;
END $$;

-- 2. Создаем enum для ролей (опционально, для лучшей типизации)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
        RAISE NOTICE 'Enum user_role создан';
    END IF;
END $$;

-- 3. Удаляем старые функции перед созданием новых
DROP FUNCTION IF EXISTS search_users_to_add_contact(TEXT);
DROP FUNCTION IF EXISTS get_user_contacts();
DROP FUNCTION IF EXISTS search_contacts_for_group(UUID, TEXT);
DROP FUNCTION IF EXISTS get_contacts_for_group(UUID);
DROP FUNCTION IF EXISTS get_group_members(UUID);

-- 4. Обновляем функцию создания профиля для включения класса
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, class_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Пользователь'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'class_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
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

-- 5. Создаем функцию для обновления профиля пользователя
CREATE OR REPLACE FUNCTION update_user_profile(
    new_name TEXT DEFAULT NULL,
    new_class_name TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL
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
        class_name = COALESCE(new_class_name, class_name),
        bio = COALESCE(new_bio, bio),
        avatar_url = COALESCE(new_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = current_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Создаем функцию для получения профиля текущего пользователя
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_bio TEXT,
    user_avatar_url TEXT,
    user_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.bio, '') as user_bio,
        COALESCE(p.avatar_url, '') as user_avatar_url,
        COALESCE(p.role, 'student') as user_role,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Создаем новую функцию поиска пользователей для добавления в контакты
CREATE FUNCTION search_users_to_add_contact(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    class_name TEXT,
    role TEXT,
    is_contact BOOLEAN
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
        COALESCE(p.class_name, '') as class_name,
        COALESCE(p.role, 'student') as role,
        EXISTS(
            SELECT 1 FROM contacts c
            WHERE c.user_id = auth.uid() AND c.contact_user_id = p.id
        ) as is_contact
    FROM profiles p
    WHERE p.id != auth.uid()
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%' OR
        COALESCE(p.class_name, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Создаем новую функцию получения контактов
CREATE FUNCTION get_user_contacts()
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_email TEXT,
    contact_class_name TEXT,
    contact_role TEXT,
    added_at TIMESTAMP WITH TIME ZONE,
    has_chat BOOLEAN
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id as contact_id,
        p.name as contact_name,
        COALESCE(p.email, '') as contact_email,
        COALESCE(p.class_name, '') as contact_class_name,
        COALESCE(p.role, 'student') as contact_role,
        c.added_at,
        EXISTS(
            SELECT 1 FROM channels ch
            WHERE ch.is_private = true
            AND ch.participant_ids @> ARRAY[auth.uid(), p.id]
            AND array_length(ch.participant_ids, 1) = 2
        ) as has_chat
    FROM contacts c
    JOIN profiles p ON p.id = c.contact_user_id
    WHERE c.user_id = auth.uid()
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Создаем новую функцию поиска контактов для группы
CREATE FUNCTION search_contacts_for_group(group_id UUID, search_term TEXT DEFAULT '')
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_role TEXT,
    is_member BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
    channel_record RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Получаем информацию о канале
    SELECT * INTO channel_record FROM channels WHERE id = group_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;
    
    -- Проверяем права доступа
    IF channel_record.admin_id != current_user_id AND 
       NOT (current_user_id = ANY(channel_record.participant_ids)) THEN
        RAISE EXCEPTION 'You do not have access to this group';
    END IF;
    
    -- Возвращаем только контакты пользователя
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.role, 'student') as user_role,
        (p.id = channel_record.admin_id OR p.id = ANY(channel_record.participant_ids)) as is_member
    FROM profiles p
    INNER JOIN contacts c ON c.contact_user_id = p.id
    WHERE c.user_id = current_user_id
    AND p.id != current_user_id
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%' OR
        COALESCE(p.class_name, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY is_member DESC, p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Создаем функцию для получения контактов для группы
CREATE FUNCTION get_contacts_for_group(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_role TEXT,
    is_member BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
    channel_record RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Получаем информацию о канале
    SELECT * INTO channel_record FROM channels WHERE id = group_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;
    
    -- Проверяем права доступа
    IF channel_record.admin_id != current_user_id AND 
       NOT (current_user_id = ANY(channel_record.participant_ids)) THEN
        RAISE EXCEPTION 'You do not have access to this group';
    END IF;
    
    -- Возвращаем все контакты пользователя
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.role, 'student') as user_role,
        (p.id = channel_record.admin_id OR p.id = ANY(channel_record.participant_ids)) as is_member
    FROM profiles p
    INNER JOIN contacts c ON c.contact_user_id = p.id
    WHERE c.user_id = current_user_id
    AND p.id != current_user_id
    ORDER BY is_member DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Создаем функцию для получения участников группы
CREATE FUNCTION get_group_members(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_role TEXT,
    is_admin BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
    channel_record RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Получаем информацию о канале
    SELECT * INTO channel_record FROM channels WHERE id = group_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;
    
    -- Проверяем права доступа
    IF channel_record.admin_id != current_user_id AND 
       NOT (current_user_id = ANY(channel_record.participant_ids)) THEN
        RAISE EXCEPTION 'You do not have access to this group';
    END IF;
    
    -- Возвращаем список участников (админ + участники)
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.role, 'student') as user_role,
        (p.id = channel_record.admin_id) as is_admin
    FROM profiles p
    WHERE p.id = channel_record.admin_id
    OR p.id = ANY(channel_record.participant_ids)
    ORDER BY is_admin DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Создаем функцию для получения пользователей по классу
CREATE FUNCTION get_users_by_class(target_class TEXT)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT
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
        COALESCE(p.role, 'student') as user_role
    FROM profiles p
    WHERE p.class_name = target_class
    AND p.id != auth.uid()
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Создаем функцию для получения списка всех классов
CREATE FUNCTION get_all_classes()
RETURNS TABLE (
    class_name TEXT,
    student_count BIGINT
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.class_name,
        COUNT(*) as student_count
    FROM profiles p
    WHERE p.class_name IS NOT NULL 
    AND p.class_name != ''
    GROUP BY p.class_name
    ORDER BY p.class_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Class and settings system added successfully' as status;

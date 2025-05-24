-- Откат к авторизации по email

-- 1. Удаляем все функции, связанные с телефонной авторизацией
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS find_user_by_phone(TEXT);
DROP FUNCTION IF EXISTS get_current_user_profile();
DROP FUNCTION IF EXISTS update_user_profile(TEXT, TEXT);
DROP FUNCTION IF EXISTS migrate_existing_users_to_phone();

-- 2. Удаляем представление
DROP VIEW IF EXISTS user_profiles;

-- 3. Удаляем триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Восстанавливаем оригинальную функцию создания профиля
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

-- 5. Восстанавливаем триггер для создания профиля
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- 6. Удаляем колонку phone из profiles (если она была добавлена)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        -- Сначала удаляем индекс
        DROP INDEX IF EXISTS profiles_phone_unique;
        -- Затем удаляем колонку
        ALTER TABLE profiles DROP COLUMN phone;
        RAISE NOTICE 'Колонка phone удалена из profiles';
    END IF;
END $$;

-- 7. Восстанавливаем NOT NULL для email в profiles
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- 8. Восстанавливаем оригинальные функции для контактов
CREATE OR REPLACE FUNCTION search_users_to_add_contact(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
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
        EXISTS(
            SELECT 1 FROM contacts c
            WHERE c.user_id = auth.uid() AND c.contact_user_id = p.id
        ) as is_contact
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

-- 9. Восстанавливаем функцию получения контактов
CREATE OR REPLACE FUNCTION get_user_contacts()
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_email TEXT,
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

-- 10. Восстанавливаем функции для групп
CREATE OR REPLACE FUNCTION search_contacts_for_group(group_id UUID, search_term TEXT DEFAULT '')
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
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
        (p.id = channel_record.admin_id OR p.id = ANY(channel_record.participant_ids)) as is_member
    FROM profiles p
    INNER JOIN contacts c ON c.contact_user_id = p.id
    WHERE c.user_id = current_user_id
    AND p.id != current_user_id
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY is_member DESC, p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Восстанавливаем функцию получения контактов для группы
CREATE OR REPLACE FUNCTION get_contacts_for_group(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
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
        (p.id = channel_record.admin_id OR p.id = ANY(channel_record.participant_ids)) as is_member
    FROM profiles p
    INNER JOIN contacts c ON c.contact_user_id = p.id
    WHERE c.user_id = current_user_id
    AND p.id != current_user_id
    ORDER BY is_member DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Восстанавливаем функцию получения участников группы
CREATE OR REPLACE FUNCTION get_group_members(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
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
        (p.id = channel_record.admin_id) as is_admin
    FROM profiles p
    WHERE p.id = channel_record.admin_id
    OR p.id = ANY(channel_record.participant_ids)
    ORDER BY is_admin DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Successfully rolled back to email authentication' as status;

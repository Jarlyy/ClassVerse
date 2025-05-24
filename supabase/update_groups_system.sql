-- Обновление системы групп для приватности и управления участниками

-- 1. Обновляем структуру таблицы channels
DO $$
BEGIN
    -- Убеждаемся, что participant_ids существует и может быть пустым для публичных каналов
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'participant_ids') THEN
        ALTER TABLE channels ADD COLUMN participant_ids UUID[] DEFAULT '{}';
        RAISE NOTICE 'Колонка participant_ids добавлена';
    END IF;

    -- Убеждаемся, что is_private существует
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'is_private') THEN
        ALTER TABLE channels ADD COLUMN is_private BOOLEAN DEFAULT false;
        RAISE NOTICE 'Колонка is_private добавлена';
    END IF;
END $$;

-- 2. Обновляем существующие публичные каналы
UPDATE channels
SET is_private = false, participant_ids = '{}'
WHERE is_private IS NULL;

-- 3. Создаем функцию для добавления участника в группу
CREATE OR REPLACE FUNCTION add_group_member(group_id UUID, user_id_to_add UUID)
RETURNS BOOLEAN AS $$
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

    -- Проверяем права: только админ или участник группы может добавлять новых участников
    IF channel_record.admin_id != current_user_id AND
       NOT (current_user_id = ANY(channel_record.participant_ids)) THEN
        RAISE EXCEPTION 'You do not have permission to add members to this group';
    END IF;

    -- Проверяем, что пользователь существует
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_add) THEN
        RAISE EXCEPTION 'User does not exist';
    END IF;

    -- Добавляем пользователя в participant_ids, если его там еще нет
    UPDATE channels
    SET participant_ids = array_append(participant_ids, user_id_to_add)
    WHERE id = group_id
    AND NOT (user_id_to_add = ANY(participant_ids));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Создаем функцию для удаления участника из группы
CREATE OR REPLACE FUNCTION remove_group_member(group_id UUID, user_id_to_remove UUID)
RETURNS BOOLEAN AS $$
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

    -- Проверяем права: только админ может удалять участников (или пользователь может удалить себя)
    IF channel_record.admin_id != current_user_id AND current_user_id != user_id_to_remove THEN
        RAISE EXCEPTION 'You do not have permission to remove this member';
    END IF;

    -- Нельзя удалить админа
    IF user_id_to_remove = channel_record.admin_id THEN
        RAISE EXCEPTION 'Cannot remove group admin';
    END IF;

    -- Удаляем пользователя из participant_ids
    UPDATE channels
    SET participant_ids = array_remove(participant_ids, user_id_to_remove)
    WHERE id = group_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем функцию для получения участников группы
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

-- 6. Создаем функцию для создания группы
CREATE OR REPLACE FUNCTION create_group(group_name TEXT, group_description TEXT DEFAULT '')
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    new_group_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Создаем группу
    INSERT INTO channels (
        name,
        subject,
        description,
        admin_id,
        is_private,
        participant_ids
    ) VALUES (
        group_name,
        'Групповое общение',
        group_description,
        current_user_id,
        false, -- Группы не приватные, но доступны только участникам
        '{}' -- Пустой массив участников, админ не включается в participant_ids
    ) RETURNING id INTO new_group_id;

    RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Обновляем RLS политики для групп
DO $$
BEGIN
    -- Удаляем старые политики
    DROP POLICY IF EXISTS "strict_channels_select_policy" ON channels;

    -- Создаем новую политику для просмотра каналов
    CREATE POLICY "channels_access_policy" ON channels
        FOR SELECT USING (
            auth.role() = 'authenticated' AND (
                -- Личные чаты видны только участникам
                (is_private = true AND auth.uid() = ANY(participant_ids)) OR
                -- Группы видны админу и участникам
                (is_private = false AND (
                    auth.uid() = admin_id OR
                    auth.uid() = ANY(participant_ids)
                )) OR
                -- Админ всегда видит свои каналы
                auth.uid() = admin_id
            )
        );

    RAISE NOTICE 'RLS политики для групп обновлены';
END $$;

-- 8. Функция поиска контактов для добавления в группу
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

-- 9. Функция для получения всех контактов для добавления в группу
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

SELECT 'Groups system updated successfully' as status;

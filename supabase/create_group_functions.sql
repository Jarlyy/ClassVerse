-- Создание функций для работы с группами

-- Удаляем существующие функции если они есть
DROP FUNCTION IF EXISTS get_group_members(UUID);
DROP FUNCTION IF EXISTS search_contacts_for_group(UUID, TEXT);
DROP FUNCTION IF EXISTS get_contacts_for_group(UUID);
DROP FUNCTION IF EXISTS add_group_member(UUID, UUID);
DROP FUNCTION IF EXISTS remove_group_member(UUID, UUID);
DROP FUNCTION IF EXISTS create_group_chat(TEXT, TEXT);
DROP FUNCTION IF EXISTS create_group(TEXT, TEXT);

-- Сначала убедимся, что таблица channel_members существует
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Убедимся, что таблица contacts существует
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_id),
    CHECK(user_id != contact_id)
);

-- Включаем RLS для таблицы участников
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Включаем RLS для таблицы контактов
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view members of their channels" ON channel_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON channel_members;
DROP POLICY IF EXISTS "Admins can manage channel members" ON channel_members;

-- Создаем политики для контактов
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own contacts" ON contacts
    FOR ALL USING (user_id = auth.uid());

-- Создаем политики RLS для участников
CREATE POLICY "Users can view members of their channels" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id
            AND cm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert themselves as members" ON channel_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage channel members" ON channel_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id
            AND cm2.user_id = auth.uid()
            AND cm2.is_admin = true
        )
    );

-- 1. Функция для получения участников группы
CREATE OR REPLACE FUNCTION get_group_members(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    is_admin BOOLEAN,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, является ли пользователь участником группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied. You are not a member of this group';
    END IF;

    RETURN QUERY
    SELECT
        cm.user_id,
        COALESCE(p.name, p.email, 'Неизвестный пользователь') as user_name,
        p.email as user_email,
        cm.is_admin,
        cm.created_at as joined_at
    FROM channel_members cm
    JOIN profiles p ON p.id = cm.user_id
    WHERE cm.channel_id = group_id
    ORDER BY cm.is_admin DESC, cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Функция для поиска контактов для добавления в группу
CREATE OR REPLACE FUNCTION search_contacts_for_group(group_id UUID, search_term TEXT)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    is_member BOOLEAN
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, является ли пользователь администратором группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = auth.uid()
        AND cm.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Only group admins can search for contacts';
    END IF;

    RETURN QUERY
    SELECT
        c.contact_id as user_id,
        COALESCE(p.name, p.email, 'Неизвестный пользователь') as user_name,
        p.email as user_email,
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = group_id
            AND cm2.user_id = c.contact_id
        ) as is_member
    FROM contacts c
    JOIN profiles p ON p.id = c.contact_id
    WHERE c.user_id = auth.uid()
    AND (
        LOWER(COALESCE(p.name, '')) LIKE LOWER('%' || search_term || '%')
        OR LOWER(p.email) LIKE LOWER('%' || search_term || '%')
    )
    ORDER BY is_member ASC, COALESCE(p.name, p.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Функция для получения всех контактов для группы
CREATE OR REPLACE FUNCTION get_contacts_for_group(group_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    is_member BOOLEAN
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, является ли пользователь администратором группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = auth.uid()
        AND cm.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Only group admins can view contacts';
    END IF;

    RETURN QUERY
    SELECT
        c.contact_id as user_id,
        COALESCE(p.name, p.email, 'Неизвестный пользователь') as user_name,
        p.email as user_email,
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = group_id
            AND cm2.user_id = c.contact_id
        ) as is_member
    FROM contacts c
    JOIN profiles p ON p.id = c.contact_id
    WHERE c.user_id = auth.uid()
    ORDER BY is_member ASC, COALESCE(p.name, p.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функция для добавления участника в группу
CREATE OR REPLACE FUNCTION add_group_member(group_id UUID, new_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, является ли текущий пользователь администратором группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = current_user_id
        AND cm.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Only group admins can add members';
    END IF;

    -- Проверяем, что новый пользователь существует
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Проверяем, что пользователь еще не является участником
    IF EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = new_user_id
    ) THEN
        RAISE EXCEPTION 'User is already a member of this group';
    END IF;

    -- Проверяем, что новый пользователь в контактах у администратора
    IF NOT EXISTS (
        SELECT 1 FROM contacts c
        WHERE c.user_id = current_user_id
        AND c.contact_id = new_user_id
    ) THEN
        RAISE EXCEPTION 'You can only add users from your contacts';
    END IF;

    -- Добавляем участника
    INSERT INTO channel_members (channel_id, user_id, is_admin)
    VALUES (group_id, new_user_id, false);

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для удаления участника из группы
CREATE OR REPLACE FUNCTION remove_group_member(group_id UUID, remove_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, является ли текущий пользователь администратором группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = current_user_id
        AND cm.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Only group admins can remove members';
    END IF;

    -- Нельзя удалить самого себя
    IF current_user_id = remove_user_id THEN
        RAISE EXCEPTION 'You cannot remove yourself from the group';
    END IF;

    -- Нельзя удалить другого администратора
    IF EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = remove_user_id
        AND cm.is_admin = true
    ) THEN
        RAISE EXCEPTION 'You cannot remove another admin from the group';
    END IF;

    -- Проверяем, что пользователь является участником группы
    IF NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = group_id
        AND cm.user_id = remove_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    -- Удаляем участника
    DELETE FROM channel_members
    WHERE channel_id = group_id
    AND user_id = remove_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для создания группы
CREATE OR REPLACE FUNCTION create_group_chat(group_name TEXT, group_description TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_group_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    IF group_name IS NULL OR TRIM(group_name) = '' THEN
        RAISE EXCEPTION 'Group name is required';
    END IF;

    -- Создаем группу
    INSERT INTO channels (name, subject, description, is_private, admin_id)
    VALUES (
        TRIM(group_name),
        'Группа',
        group_description,
        false,
        current_user_id
    )
    RETURNING id INTO new_group_id;

    -- Добавляем создателя как администратора
    INSERT INTO channel_members (channel_id, user_id, is_admin)
    VALUES (new_group_id, current_user_id, true);

    RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права на выполнение функций
GRANT EXECUTE ON FUNCTION get_group_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_contacts_for_group(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contacts_for_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_chat(TEXT, TEXT) TO authenticated;

SELECT 'Group functions created successfully' as status;

-- Добавляем поддержку личных чатов

-- Добавляем новые поля в таблицу channels
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT '{}';

-- Создаем индекс для быстрого поиска личных чатов
CREATE INDEX IF NOT EXISTS idx_channels_private ON channels (is_private) WHERE is_private = true;
CREATE INDEX IF NOT EXISTS idx_channels_participants ON channels USING GIN (participant_ids) WHERE is_private = true;

-- Обновляем политики RLS для поддержки личных чатов

-- Удаляем старые политики для channels
DROP POLICY IF EXISTS "Enable read access for all users" ON channels;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON channels;

-- Создаем новые политики для channels
-- Пользователи могут видеть:
-- 1. Все публичные каналы (is_private = false)
-- 2. Личные чаты, где они являются участниками
CREATE POLICY "Users can view channels" ON channels
    FOR SELECT USING (
        NOT is_private OR
        (is_private AND auth.uid() = ANY(participant_ids)) OR
        auth.uid() = admin_id
    );

-- Пользователи могут создавать каналы и личные чаты
CREATE POLICY "Users can create channels" ON channels
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            -- Для публичных каналов - пользователь должен быть админом
            (NOT is_private AND auth.uid() = admin_id) OR
            -- Для личных чатов - пользователь должен быть в списке участников
            (is_private AND auth.uid() = ANY(participant_ids))
        )
    );

-- Функция для добавления контакта (создания личного чата между двумя пользователями)
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

-- Функция для поиска пользователей для добавления в контакты
CREATE OR REPLACE FUNCTION search_users_for_chat(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    has_existing_chat BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        EXISTS(
            SELECT 1 FROM channels c
            WHERE c.is_private = true
            AND c.participant_ids @> ARRAY[current_user_id, p.id]
            AND array_length(c.participant_ids, 1) = 2
        ) as has_existing_chat
    FROM profiles p
    WHERE p.id != current_user_id
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        p.email ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем политики для messages, чтобы учитывать личные чаты
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                NOT c.is_private OR
                (c.is_private AND auth.uid() = ANY(c.participant_ids)) OR
                auth.uid() = c.admin_id
            )
        )
    );

-- Обновляем политику для создания сообщений
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;

CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                NOT c.is_private OR
                (c.is_private AND auth.uid() = ANY(c.participant_ids)) OR
                auth.uid() = c.admin_id
            )
        )
    );

SELECT 'Private chat support added successfully' as status;

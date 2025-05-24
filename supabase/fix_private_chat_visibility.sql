-- Исправление видимости личных чатов

-- Обновляем RLS политики для channels
DO $$
BEGIN
    -- Удаляем все существующие политики для channels
    DROP POLICY IF EXISTS "Users can view channels" ON channels;
    DROP POLICY IF EXISTS "Users can view all channels" ON channels;
    DROP POLICY IF EXISTS "Enable read access for all users" ON channels;
    DROP POLICY IF EXISTS "Allow authenticated users to read all channels" ON channels;

    -- Создаем новую политику для просмотра каналов
    -- Пользователи могут видеть:
    -- 1. Все публичные каналы (is_private = false или is_private IS NULL)
    -- 2. Только те личные чаты, где они являются участниками
    CREATE POLICY "Users can view channels based on privacy" ON channels
        FOR SELECT USING (
            auth.role() = 'authenticated' AND (
                -- Публичные каналы видны всем
                COALESCE(is_private, false) = false OR
                -- Личные чаты видны только участникам
                (is_private = true AND auth.uid() = ANY(participant_ids)) OR
                -- Админ канала всегда может видеть свой канал
                auth.uid() = admin_id
            )
        );

    RAISE NOTICE 'RLS политика для просмотра каналов обновлена';
END $$;

-- Также обновляем политики для создания каналов
DO $$
BEGIN
    -- Удаляем старые политики создания
    DROP POLICY IF EXISTS "Users can create channels" ON channels;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON channels;
    DROP POLICY IF EXISTS "Allow authenticated users to create channels" ON channels;

    -- Создаем новую политику для создания каналов
    CREATE POLICY "Users can create channels based on type" ON channels
        FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND
            (
                -- Для публичных каналов - пользователь должен быть админом
                (COALESCE(is_private, false) = false AND auth.uid() = admin_id) OR
                -- Для личных чатов - пользователь должен быть в списке участников
                (is_private = true AND auth.uid() = ANY(participant_ids))
            )
        );

    RAISE NOTICE 'RLS политика для создания каналов обновлена';
END $$;

-- Обновляем политики для обновления каналов
DO $$
BEGIN
    -- Удаляем старые политики обновления
    DROP POLICY IF EXISTS "Users can update their own channels" ON channels;
    DROP POLICY IF EXISTS "Enable update for users based on admin_id" ON channels;

    -- Создаем новую политику для обновления каналов
    CREATE POLICY "Users can update channels based on permissions" ON channels
        FOR UPDATE USING (
            auth.role() = 'authenticated' AND (
                -- Админ может обновлять свои каналы
                auth.uid() = admin_id OR
                -- Участники личных чатов могут обновлять некоторые поля
                (is_private = true AND auth.uid() = ANY(participant_ids))
            )
        ) WITH CHECK (
            auth.role() = 'authenticated' AND (
                -- Админ может обновлять свои каналы
                auth.uid() = admin_id OR
                -- Участники личных чатов могут обновлять некоторые поля
                (is_private = true AND auth.uid() = ANY(participant_ids))
            )
        );

    RAISE NOTICE 'RLS политика для обновления каналов обновлена';
END $$;

-- Обновляем политики для удаления каналов
DO $$
BEGIN
    -- Удаляем старые политики удаления
    DROP POLICY IF EXISTS "Users can delete their own channels" ON channels;
    DROP POLICY IF EXISTS "Enable delete for users based on admin_id" ON channels;

    -- Создаем новую политику для удаления каналов
    CREATE POLICY "Users can delete channels based on permissions" ON channels
        FOR DELETE USING (
            auth.role() = 'authenticated' AND
            -- Только админ может удалять каналы
            auth.uid() = admin_id
        );

    RAISE NOTICE 'RLS политика для удаления каналов обновлена';
END $$;

-- Также обновляем политики для messages, чтобы они учитывали приватность каналов
DO $$
BEGIN
    -- Удаляем старые политики для messages
    DROP POLICY IF EXISTS "Users can view messages" ON messages;
    DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
    DROP POLICY IF EXISTS "Allow authenticated users to read all messages" ON messages;

    -- Создаем новую политику для просмотра сообщений
    CREATE POLICY "Users can view messages based on channel access" ON messages
        FOR SELECT USING (
            auth.role() = 'authenticated' AND
            EXISTS (
                SELECT 1 FROM channels c
                WHERE c.id = messages.channel_id
                AND (
                    -- Публичные каналы
                    COALESCE(c.is_private, false) = false OR
                    -- Личные чаты, где пользователь участник
                    (c.is_private = true AND auth.uid() = ANY(c.participant_ids)) OR
                    -- Админ канала
                    auth.uid() = c.admin_id
                )
            )
        );

    RAISE NOTICE 'RLS политика для просмотра сообщений обновлена';
END $$;

-- Обновляем политику создания сообщений
DO $$
BEGIN
    -- Удаляем старые политики создания сообщений
    DROP POLICY IF EXISTS "Users can create messages" ON messages;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;

    -- Создаем новую политику для создания сообщений
    CREATE POLICY "Users can create messages based on channel access" ON messages
        FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM channels c
                WHERE c.id = messages.channel_id
                AND (
                    -- Публичные каналы
                    COALESCE(c.is_private, false) = false OR
                    -- Личные чаты, где пользователь участник
                    (c.is_private = true AND auth.uid() = ANY(c.participant_ids)) OR
                    -- Админ канала
                    auth.uid() = c.admin_id
                )
            )
        );

    RAISE NOTICE 'RLS политика для создания сообщений обновлена';
END $$;

-- Обновляем функцию поиска пользователей, чтобы она правильно определяла существующие чаты
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
        COALESCE(p.email, '') as email,
        EXISTS(
            SELECT 1 FROM channels c
            WHERE c.is_private = true
            AND c.participant_ids @> ARRAY[auth.uid(), p.id]
            AND array_length(c.participant_ids, 1) = 2
        ) as has_existing_chat
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

-- Проверяем результат
SELECT 'Privacy policies updated successfully' as status;

-- Показываем текущие политики для channels
SELECT 'Current RLS policies for channels:' as info;
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'channels'
ORDER BY policyname;

-- Показываем текущие политики для messages
SELECT 'Current RLS policies for messages:' as info;
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

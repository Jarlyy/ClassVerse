-- Принудительное исправление RLS политик для приватности личных чатов

-- 1. Включаем RLS для таблицы channels (если не включен)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем ВСЕ существующие политики для channels
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Получаем все политики для таблицы channels
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'channels'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON channels';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 3. Создаем новые строгие RLS политики

-- Политика для SELECT (просмотр каналов)
CREATE POLICY "strict_channels_select_policy" ON channels
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            -- Публичные каналы видны всем
            (is_private IS NULL OR is_private = false) OR
            -- Личные чаты видны только участникам
            (is_private = true AND auth.uid() = ANY(participant_ids)) OR
            -- Админ всегда видит свои каналы
            (auth.uid() = admin_id)
        )
    );

-- Политика для INSERT (создание каналов)
CREATE POLICY "strict_channels_insert_policy" ON channels
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            -- Для публичных каналов - пользователь должен быть админом
            ((is_private IS NULL OR is_private = false) AND auth.uid() = admin_id) OR
            -- Для личных чатов - пользователь должен быть в списке участников
            (is_private = true AND auth.uid() = ANY(participant_ids))
        )
    );

-- Политика для UPDATE (обновление каналов)
CREATE POLICY "strict_channels_update_policy" ON channels
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

-- Политика для DELETE (удаление каналов)
CREATE POLICY "strict_channels_delete_policy" ON channels
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        -- Только админ может удалять каналы
        auth.uid() = admin_id
    );

-- 4. Также обновляем политики для messages

-- Включаем RLS для messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики для messages
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON messages';
        RAISE NOTICE 'Dropped messages policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Политика для просмотра сообщений
CREATE POLICY "strict_messages_select_policy" ON messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Публичные каналы
                (c.is_private IS NULL OR c.is_private = false) OR 
                -- Личные чаты, где пользователь участник
                (c.is_private = true AND auth.uid() = ANY(c.participant_ids)) OR
                -- Админ канала
                auth.uid() = c.admin_id
            )
        )
    );

-- Политика для создания сообщений
CREATE POLICY "strict_messages_insert_policy" ON messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Публичные каналы
                (c.is_private IS NULL OR c.is_private = false) OR 
                -- Личные чаты, где пользователь участник
                (c.is_private = true AND auth.uid() = ANY(c.participant_ids)) OR
                -- Админ канала
                auth.uid() = c.admin_id
            )
        )
    );

-- 5. Проверяем результат
SELECT 'RLS policies updated successfully' as status;

-- Показываем новые политики
SELECT 'New RLS policies for channels:' as info;
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'channels'
ORDER BY cmd, policyname;

SELECT 'New RLS policies for messages:' as info;
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY cmd, policyname;

-- Проверяем, что RLS включен
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('channels', 'messages');

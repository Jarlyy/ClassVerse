-- Проверка RLS политик для приватности личных чатов

-- 1. Проверяем, включен ли RLS для таблицы channels
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'channels';

-- 2. Показываем все текущие политики для channels
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'channels'
ORDER BY cmd, policyname;

-- 3. Проверяем структуру таблицы channels
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'channels'
ORDER BY ordinal_position;

-- 4. Показываем примеры данных в channels (только структуру)
SELECT 
    id,
    name,
    is_private,
    participant_ids,
    admin_id,
    CASE 
        WHEN is_private = true THEN 'PRIVATE'
        ELSE 'PUBLIC'
    END as channel_type,
    array_length(participant_ids, 1) as participant_count
FROM channels
LIMIT 5;

-- 5. Проверяем текущего пользователя
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 6. Тестируем видимость каналов для текущего пользователя
SELECT 
    'Channels visible to current user:' as info;
    
SELECT 
    c.id,
    c.name,
    c.is_private,
    c.participant_ids,
    c.admin_id,
    CASE 
        WHEN auth.uid() = c.admin_id THEN 'admin'
        WHEN auth.uid() = ANY(c.participant_ids) THEN 'participant'
        ELSE 'other'
    END as user_role,
    CASE 
        WHEN COALESCE(c.is_private, false) = false THEN 'should_see_public'
        WHEN c.is_private = true AND auth.uid() = ANY(c.participant_ids) THEN 'should_see_private'
        WHEN c.is_private = true AND auth.uid() = c.admin_id THEN 'should_see_as_admin'
        ELSE 'should_NOT_see'
    END as visibility_rule
FROM channels c
ORDER BY c.is_private, c.created_at;

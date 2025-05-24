-- Тест приватности личных чатов

-- 1. Показываем всех пользователей
SELECT 'All users in system:' as info;
SELECT id, email, raw_user_meta_data->>'name' as name FROM auth.users;

-- 2. Показываем все каналы (должны быть видны только публичные + личные чаты текущего пользователя)
SELECT 'Channels visible to current user:' as info;
SELECT 
    id,
    name,
    subject,
    is_private,
    participant_ids,
    admin_id,
    CASE 
        WHEN auth.uid() = admin_id THEN 'admin'
        WHEN auth.uid() = ANY(participant_ids) THEN 'participant'
        ELSE 'other'
    END as user_role
FROM channels
ORDER BY is_private, created_at;

-- 3. Показываем личные чаты с детальной информацией
SELECT 'Private chats details:' as info;
SELECT 
    c.id,
    c.name,
    c.participant_ids,
    array_length(c.participant_ids, 1) as participant_count,
    auth.uid() as current_user,
    auth.uid() = ANY(c.participant_ids) as is_participant
FROM channels c
WHERE c.is_private = true;

-- 4. Тестируем функцию поиска пользователей
SELECT 'Search function test:' as info;
SELECT * FROM search_users_for_chat('') LIMIT 5;

-- 5. Проверяем RLS политики
SELECT 'RLS policies check:' as info;
SELECT 
    'channels' as table_name,
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies 
WHERE tablename = 'channels'
UNION ALL
SELECT 
    'messages' as table_name,
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY table_name, cmd, policyname;

-- 6. Показываем текущего пользователя
SELECT 'Current user info:' as info;
SELECT 
    auth.uid() as user_id,
    auth.role() as user_role,
    CASE WHEN auth.uid() IS NOT NULL THEN 'authenticated' ELSE 'not authenticated' END as auth_status;

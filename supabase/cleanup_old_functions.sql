-- Очистка старых функций перед обновлением

-- Удаляем все старые функции, которые будут пересозданы
DROP FUNCTION IF EXISTS search_users_to_add_contact(TEXT);
DROP FUNCTION IF EXISTS get_user_contacts();
DROP FUNCTION IF EXISTS search_contacts_for_group(UUID, TEXT);
DROP FUNCTION IF EXISTS get_contacts_for_group(UUID);
DROP FUNCTION IF EXISTS get_group_members(UUID);
DROP FUNCTION IF EXISTS update_user_profile(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_current_user_profile();
DROP FUNCTION IF EXISTS get_users_by_class(TEXT);
DROP FUNCTION IF EXISTS get_all_classes();

-- Показываем оставшиеся функции
SELECT 'Remaining functions:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%user%' OR routine_name LIKE '%profile%' OR routine_name LIKE '%contact%')
ORDER BY routine_name;

SELECT 'Old functions cleaned up successfully' as status;

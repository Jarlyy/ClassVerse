-- Удаление старых функций контактов

-- Удаляем все старые функции с их оригинальными параметрами
DROP FUNCTION IF EXISTS get_user_contacts();
DROP FUNCTION IF EXISTS add_contact(uuid);
DROP FUNCTION IF EXISTS remove_contact(uuid);
DROP FUNCTION IF EXISTS create_private_chat_with_contact(uuid);

-- Также удаляем возможные варианты с другими типами параметров
DROP FUNCTION IF EXISTS add_contact(contact_user_id uuid);
DROP FUNCTION IF EXISTS remove_contact(contact_user_id uuid);
DROP FUNCTION IF EXISTS create_private_chat_with_contact(contact_user_id uuid);

SELECT 'Old functions dropped successfully' as status;

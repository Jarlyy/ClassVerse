-- Исправление функций контактов

-- Удаляем все старые функции с их оригинальными параметрами
DROP FUNCTION IF EXISTS get_user_contacts();
DROP FUNCTION IF EXISTS add_contact(uuid);
DROP FUNCTION IF EXISTS remove_contact(uuid);
DROP FUNCTION IF EXISTS create_private_chat_with_contact(uuid);

-- Создаем исправленную функцию
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

-- Также исправляем функцию add_contact для лучшей обработки ошибок
CREATE OR REPLACE FUNCTION add_contact(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Получаем ID текущего пользователя
    current_user_id := auth.uid();

    -- Проверяем аутентификацию
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, что не добавляем себя
    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as contact';
    END IF;

    -- Проверяем, что пользователь существует в profiles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'User does not exist';
    END IF;

    -- Добавляем контакт (если уже существует, ничего не происходит)
    INSERT INTO contacts (user_id, contact_user_id)
    VALUES (current_user_id, target_user_id)
    ON CONFLICT (user_id, contact_user_id) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию remove_contact
CREATE OR REPLACE FUNCTION remove_contact(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    DELETE FROM contacts
    WHERE user_id = current_user_id AND contact_user_id = target_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию create_private_chat_with_contact
CREATE OR REPLACE FUNCTION create_private_chat_with_contact(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    existing_chat_id UUID;
    new_chat_id UUID;
    current_user_name TEXT;
    target_user_name TEXT;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, что пользователь в контактах
    IF NOT EXISTS (
        SELECT 1 FROM contacts
        WHERE user_id = current_user_id AND contact_user_id = target_user_id
    ) THEN
        RAISE EXCEPTION 'User is not in your contacts. Add them as contact first.';
    END IF;

    -- Проверяем существующий чат
    SELECT id INTO existing_chat_id
    FROM channels
    WHERE is_private = true
    AND participant_ids @> ARRAY[current_user_id, target_user_id]
    AND array_length(participant_ids, 1) = 2;

    IF existing_chat_id IS NOT NULL THEN
        RETURN existing_chat_id;
    END IF;

    -- Получаем имена
    SELECT name INTO current_user_name FROM profiles WHERE id = current_user_id;
    SELECT name INTO target_user_name FROM profiles WHERE id = target_user_id;

    -- Создаем чат
    INSERT INTO channels (
        name,
        subject,
        description,
        admin_id,
        is_private,
        participant_ids
    ) VALUES (
        'Личный чат',
        'Личное общение',
        'Личный чат между ' || COALESCE(current_user_name, 'пользователем') || ' и ' || COALESCE(target_user_name, 'пользователем'),
        current_user_id,
        true,
        ARRAY[current_user_id, target_user_id]
    ) RETURNING id INTO new_chat_id;

    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Тестируем функции
SELECT 'Functions updated successfully' as status;

-- Показываем информацию о функциях
SELECT
    routine_name,
    routine_type,
    'Updated' as status
FROM information_schema.routines
WHERE routine_name IN ('get_user_contacts', 'add_contact', 'remove_contact', 'create_private_chat_with_contact')
AND routine_schema = 'public';

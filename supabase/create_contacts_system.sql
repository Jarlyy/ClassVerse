-- Создание системы контактов как в Telegram

-- 1. Создаем таблицу контактов
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id),
    CHECK (user_id != contact_user_id) -- Нельзя добавить себя в контакты
);

-- 2. Включаем RLS для таблицы contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 3. Создаем RLS политики для contacts
-- Пользователи могут видеть только свои контакты
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут добавлять контакты
CREATE POLICY "Users can add contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять свои контакты
CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);

-- 5. Функция для добавления контакта
CREATE OR REPLACE FUNCTION add_contact(contact_user_id UUID)
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
    IF current_user_id = contact_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as contact';
    END IF;

    -- Проверяем, что пользователь существует
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = contact_user_id) THEN
        RAISE EXCEPTION 'User does not exist';
    END IF;

    -- Добавляем контакт (если уже существует, ничего не происходит)
    INSERT INTO contacts (user_id, contact_user_id)
    VALUES (current_user_id, contact_user_id)
    ON CONFLICT (user_id, contact_user_id) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для удаления контакта
CREATE OR REPLACE FUNCTION remove_contact(contact_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    DELETE FROM contacts
    WHERE user_id = current_user_id AND contact_user_id = contact_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для получения списка контактов пользователя
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

-- 8. Обновляем функцию поиска пользователей для добавления в контакты
CREATE OR REPLACE FUNCTION search_users_to_add_contact(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    is_contact BOOLEAN
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
            SELECT 1 FROM contacts c
            WHERE c.user_id = auth.uid() AND c.contact_user_id = p.id
        ) as is_contact
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

-- 9. Обновляем функцию создания личного чата (теперь только между контактами)
CREATE OR REPLACE FUNCTION create_private_chat_with_contact(contact_user_id UUID)
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    existing_chat_id UUID;
    new_chat_id UUID;
    current_user_name TEXT;
    contact_user_name TEXT;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем, что пользователь в контактах
    IF NOT EXISTS (
        SELECT 1 FROM contacts
        WHERE user_id = current_user_id AND contact_user_id = contact_user_id
    ) THEN
        RAISE EXCEPTION 'User is not in your contacts. Add them as contact first.';
    END IF;

    -- Проверяем существующий чат
    SELECT id INTO existing_chat_id
    FROM channels
    WHERE is_private = true
    AND participant_ids @> ARRAY[current_user_id, contact_user_id]
    AND array_length(participant_ids, 1) = 2;

    IF existing_chat_id IS NOT NULL THEN
        RETURN existing_chat_id;
    END IF;

    -- Получаем имена
    SELECT name INTO current_user_name FROM profiles WHERE id = current_user_id;
    SELECT name INTO contact_user_name FROM profiles WHERE id = contact_user_id;

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
        'Личный чат между ' || COALESCE(current_user_name, 'пользователем') || ' и ' || COALESCE(contact_user_name, 'пользователем'),
        current_user_id,
        true,
        ARRAY[current_user_id, contact_user_id]
    ) RETURNING id INTO new_chat_id;

    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Создаем тестовые контакты (опционально)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;

    IF user_count >= 2 THEN
        -- Добавляем взаимные контакты между первыми двумя пользователями
        INSERT INTO contacts (user_id, contact_user_id)
        SELECT u1.id, u2.id
        FROM (SELECT id FROM auth.users LIMIT 1) u1
        CROSS JOIN (SELECT id FROM auth.users OFFSET 1 LIMIT 1) u2
        ON CONFLICT DO NOTHING;

        INSERT INTO contacts (user_id, contact_user_id)
        SELECT u2.id, u1.id
        FROM (SELECT id FROM auth.users LIMIT 1) u1
        CROSS JOIN (SELECT id FROM auth.users OFFSET 1 LIMIT 1) u2
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Test contacts created between first two users';
    END IF;
END $$;

SELECT 'Contacts system created successfully' as status;

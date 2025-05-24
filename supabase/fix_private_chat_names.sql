-- Исправление отображения имен в личных чатах

-- Обновляем функцию создания личного чата
CREATE OR REPLACE FUNCTION create_private_chat(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    existing_chat_id UUID;
    new_chat_id UUID;
    current_user_name TEXT;
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
    
    -- Получаем имена пользователей
    SELECT name INTO current_user_name FROM profiles WHERE id = current_user_id;
    SELECT name INTO other_user_name FROM profiles WHERE id = other_user_id;
    
    -- Если имена не найдены, используем email
    IF current_user_name IS NULL THEN
        SELECT split_part(email, '@', 1) INTO current_user_name
        FROM auth.users WHERE id = current_user_id;
    END IF;
    
    IF other_user_name IS NULL THEN
        SELECT split_part(email, '@', 1) INTO other_user_name
        FROM auth.users WHERE id = other_user_id;
    END IF;
    
    -- Создаем новый личный чат с общим названием
    -- Название будет динамически формироваться на клиенте
    INSERT INTO channels (
        name,
        subject,
        description,
        admin_id,
        is_private,
        participant_ids
    ) VALUES (
        'Личный чат',  -- Общее название, будет переопределяться на клиенте
        'Личное общение',
        'Личный чат между ' || COALESCE(current_user_name, 'пользователем') || ' и ' || COALESCE(other_user_name, 'пользователем'),
        current_user_id,
        true,
        ARRAY[current_user_id, other_user_id]
    ) RETURNING id INTO new_chat_id;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для получения имени собеседника в личном чате
CREATE OR REPLACE FUNCTION get_chat_partner_name(channel_id UUID, current_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    partner_id UUID;
    partner_name TEXT;
BEGIN
    -- Находим ID собеседника
    SELECT unnest(participant_ids) INTO partner_id
    FROM channels
    WHERE id = channel_id
    AND is_private = true
    AND unnest(participant_ids) != current_user_id
    LIMIT 1;
    
    -- Получаем имя собеседника
    SELECT name INTO partner_name
    FROM profiles
    WHERE id = partner_id;
    
    -- Если имя не найдено, используем email
    IF partner_name IS NULL THEN
        SELECT split_part(email, '@', 1) INTO partner_name
        FROM auth.users
        WHERE id = partner_id;
    END IF;
    
    RETURN COALESCE(partner_name, 'Неизвестный пользователь');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Private chat functions updated successfully' as status;

-- Создание функции для добавления контактов (личных чатов)

-- Сначала убедимся, что таблица channels имеет нужные колонки
DO $$
BEGIN
    -- Добавляем is_private, если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'is_private') THEN
        ALTER TABLE channels ADD COLUMN is_private BOOLEAN DEFAULT false;
        RAISE NOTICE 'Колонка is_private добавлена в channels';
    END IF;
    
    -- Добавляем participant_ids, если его нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'participant_ids') THEN
        ALTER TABLE channels ADD COLUMN participant_ids UUID[] DEFAULT '{}';
        RAISE NOTICE 'Колонка participant_ids добавлена в channels';
    END IF;
END $$;

-- Создаем индексы для быстрого поиска личных чатов
CREATE INDEX IF NOT EXISTS idx_channels_private ON channels (is_private) WHERE is_private = true;
CREATE INDEX IF NOT EXISTS idx_channels_participants ON channels USING GIN (participant_ids) WHERE is_private = true;

-- Создаем функцию для добавления контакта (создания личного чата)
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
    
    -- Если имя не найдено, используем email или дефолтное значение
    IF other_user_name IS NULL THEN
        SELECT COALESCE(
            split_part(email, '@', 1),
            'пользователь'
        ) INTO other_user_name
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

-- Обновляем RLS политики для channels с поддержкой личных чатов
DO $$
BEGIN
    -- Удаляем старые политики
    DROP POLICY IF EXISTS "Users can view channels" ON channels;
    DROP POLICY IF EXISTS "Users can create channels" ON channels;
    DROP POLICY IF EXISTS "Enable read access for all users" ON channels;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON channels;
    
    -- Создаем новые политики
    -- Пользователи могут видеть:
    -- 1. Все публичные каналы (is_private = false или is_private IS NULL)
    -- 2. Личные чаты, где они являются участниками
    CREATE POLICY "Users can view channels" ON channels
        FOR SELECT USING (
            auth.role() = 'authenticated' AND (
                COALESCE(is_private, false) = false OR 
                (is_private = true AND auth.uid() = ANY(participant_ids)) OR
                auth.uid() = admin_id
            )
        );
    
    -- Пользователи могут создавать каналы и личные чаты
    CREATE POLICY "Users can create channels" ON channels
        FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND
            (
                -- Для публичных каналов - пользователь должен быть админом
                (COALESCE(is_private, false) = false AND auth.uid() = admin_id) OR
                -- Для личных чатов - пользователь должен быть в списке участников
                (is_private = true AND auth.uid() = ANY(participant_ids))
            )
        );
        
    RAISE NOTICE 'RLS политики для channels обновлены';
END $$;

-- Тестируем функцию
SELECT 'Function create_private_chat created successfully' as status;

-- Показываем информацию о функции
SELECT 
    routine_name,
    routine_type,
    'Created' as status
FROM information_schema.routines 
WHERE routine_name = 'create_private_chat' 
AND routine_schema = 'public';

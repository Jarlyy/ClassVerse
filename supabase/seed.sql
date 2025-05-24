-- Добавляем тестовые каналы
-- Замените 'your-user-id' на реальный ID пользователя из таблицы auth.users

-- Получаем первого пользователя для тестирования
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Получаем ID первого пользователя
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- Если пользователь найден, создаем тестовые каналы
    IF test_user_id IS NOT NULL THEN
        -- Вставляем тестовые каналы
        INSERT INTO channels (name, subject, description, admin_id) VALUES
        ('Математика 11А', 'Математика', 'Канал для обсуждения математики в 11А классе', test_user_id),
        ('Физика 11А', 'Физика', 'Канал для обсуждения физики в 11А классе', test_user_id),
        ('Русский язык 11А', 'Русский язык', 'Канал для обсуждения русского языка в 11А классе', test_user_id),
        ('История 11А', 'История', 'Канал для обсуждения истории в 11А классе', test_user_id),
        ('Английский язык 11А', 'Английский язык', 'Канал для обсуждения английского языка в 11А классе', test_user_id),
        ('Общий чат 11А', 'Общение', 'Общий канал для неформального общения класса', test_user_id);
        
        -- Добавляем несколько тестовых сообщений
        INSERT INTO messages (channel_id, user_id, content) 
        SELECT 
            c.id,
            test_user_id,
            CASE 
                WHEN c.subject = 'Математика' THEN 'Привет всем! Кто-нибудь решил задачу №15 из учебника?'
                WHEN c.subject = 'Физика' THEN 'Напоминаю, что завтра контрольная по теме "Электричество"'
                WHEN c.subject = 'Русский язык' THEN 'Не забудьте подготовить сочинение к пятнице'
                WHEN c.subject = 'История' THEN 'Интересная статья о Второй мировой войне: https://example.com'
                WHEN c.subject = 'Английский язык' THEN 'Hello everyone! Don''t forget about our presentation next week'
                WHEN c.subject = 'Общение' THEN 'Привет! Как дела у всех?'
                ELSE 'Добро пожаловать в канал!'
            END
        FROM channels c
        WHERE c.admin_id = test_user_id;
        
        RAISE NOTICE 'Тестовые данные успешно добавлены для пользователя %', test_user_id;
    ELSE
        RAISE NOTICE 'Пользователи не найдены. Сначала зарегистрируйтесь в приложении.';
    END IF;
END $$;

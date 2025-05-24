-- Добавление поля "класс" и настроек профиля

-- 1. Добавляем колонку class_name в таблицу profiles
DO $$
BEGIN
    -- Добавляем колонку class_name, если её нет
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'class_name') THEN
        ALTER TABLE profiles ADD COLUMN class_name TEXT;
        RAISE NOTICE 'Колонка class_name добавлена в profiles';
    END IF;

    -- Добавляем колонку bio для описания пользователя
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Колонка bio добавлена в profiles';
    END IF;

    -- Добавляем колонку avatar_url для аватара
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Колонка avatar_url добавлена в profiles';
    END IF;

    -- Добавляем колонку role для роли пользователя (student, teacher, admin)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'student';
        RAISE NOTICE 'Колонка role добавлена в profiles';
    END IF;
END $$;

-- 2. Создаем enum для ролей (опционально, для лучшей типизации)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
        RAISE NOTICE 'Enum user_role создан';
    END IF;
END $$;

-- 3. Обновляем функцию создания профиля для включения класса
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, class_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Пользователь'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'class_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Логируем ошибку, но не прерываем регистрацию
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Создаем функцию для обновления профиля пользователя
CREATE OR REPLACE FUNCTION update_user_profile(
    new_name TEXT DEFAULT NULL,
    new_class_name TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    UPDATE profiles
    SET
        name = COALESCE(new_name, name),
        class_name = COALESCE(new_class_name, class_name),
        bio = COALESCE(new_bio, bio),
        avatar_url = COALESCE(new_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = current_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем функцию для получения профиля текущего пользователя
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_bio TEXT,
    user_avatar_url TEXT,
    user_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.bio, '') as user_bio,
        COALESCE(p.avatar_url, '') as user_avatar_url,
        COALESCE(p.role, 'student') as user_role,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Обновляем функции поиска для включения класса
CREATE OR REPLACE FUNCTION search_users_to_add_contact(search_term TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    class_name TEXT,
    role TEXT,
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
        COALESCE(p.class_name, '') as class_name,
        COALESCE(p.role, 'student') as role,
        EXISTS(
            SELECT 1 FROM contacts c
            WHERE c.user_id = auth.uid() AND c.contact_user_id = p.id
        ) as is_contact
    FROM profiles p
    WHERE p.id != auth.uid()
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%' OR
        COALESCE(p.class_name, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Обновляем функцию получения контактов
CREATE OR REPLACE FUNCTION get_user_contacts()
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_email TEXT,
    contact_class_name TEXT,
    contact_role TEXT,
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
        COALESCE(p.class_name, '') as contact_class_name,
        COALESCE(p.role, 'student') as contact_role,
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

-- 8. Обновляем функции для групп
CREATE OR REPLACE FUNCTION search_contacts_for_group(group_id UUID, search_term TEXT DEFAULT '')
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_class_name TEXT,
    user_role TEXT,
    is_member BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
    channel_record RECORD;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Получаем информацию о канале
    SELECT * INTO channel_record FROM channels WHERE id = group_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;

    -- Проверяем права доступа
    IF channel_record.admin_id != current_user_id AND
       NOT (current_user_id = ANY(channel_record.participant_ids)) THEN
        RAISE EXCEPTION 'You do not have access to this group';
    END IF;

    -- Возвращаем только контакты пользователя
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.class_name, '') as user_class_name,
        COALESCE(p.role, 'student') as user_role,
        (p.id = channel_record.admin_id OR p.id = ANY(channel_record.participant_ids)) as is_member
    FROM profiles p
    INNER JOIN contacts c ON c.contact_user_id = p.id
    WHERE c.user_id = current_user_id
    AND p.id != current_user_id
    AND (
        search_term = '' OR
        p.name ILIKE '%' || search_term || '%' OR
        COALESCE(p.email, '') ILIKE '%' || search_term || '%' OR
        COALESCE(p.class_name, '') ILIKE '%' || search_term || '%'
    )
    ORDER BY is_member DESC, p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Создаем функцию для получения пользователей по классу
CREATE OR REPLACE FUNCTION get_users_by_class(target_class TEXT)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.name as user_name,
        COALESCE(p.email, '') as user_email,
        COALESCE(p.role, 'student') as user_role
    FROM profiles p
    WHERE p.class_name = target_class
    AND p.id != auth.uid()
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Создаем функцию для получения списка всех классов
CREATE OR REPLACE FUNCTION get_all_classes()
RETURNS TABLE (
    class_name TEXT,
    student_count BIGINT
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.class_name,
        COUNT(*) as student_count
    FROM profiles p
    WHERE p.class_name IS NOT NULL
    AND p.class_name != ''
    GROUP BY p.class_name
    ORDER BY p.class_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Создаем таблицу расписаний для классов
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Понедельник, 7=Воскресенье
    lesson_number INTEGER NOT NULL CHECK (lesson_number >= 1 AND lesson_number <= 10),
    subject_name TEXT NOT NULL,
    teacher_name TEXT,
    classroom TEXT,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(class_name, day_of_week, lesson_number)
);

-- 12. Включаем RLS для таблицы расписаний
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- 13. Создаем политики RLS для расписаний
CREATE POLICY "Users can view schedules for their class" ON class_schedules
    FOR SELECT USING (
        class_name IN (
            SELECT p.class_name FROM profiles p WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Only admin can modify schedules" ON class_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.email = 'rrzakirov11@gmail.com'
        )
    );

-- 14. Создаем функцию для получения расписания класса
CREATE OR REPLACE FUNCTION get_class_schedule(target_class_name TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    class_name TEXT,
    day_of_week INTEGER,
    day_name TEXT,
    lesson_number INTEGER,
    subject_name TEXT,
    teacher_name TEXT,
    classroom TEXT,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_class_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Если класс не указан, берем класс текущего пользователя
    IF target_class_name IS NULL THEN
        SELECT p.class_name INTO user_class_name
        FROM profiles p
        WHERE p.id = auth.uid();

        IF user_class_name IS NULL THEN
            RAISE EXCEPTION 'User class not found';
        END IF;

        target_class_name := user_class_name;
    END IF;

    -- Проверяем права доступа (пользователь может видеть только расписание своего класса или админ все)
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (p.class_name = target_class_name OR p.email = 'rrzakirov11@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Access denied to this class schedule';
    END IF;

    RETURN QUERY
    SELECT
        cs.id,
        cs.class_name,
        cs.day_of_week,
        CASE cs.day_of_week
            WHEN 1 THEN 'Понедельник'
            WHEN 2 THEN 'Вторник'
            WHEN 3 THEN 'Среда'
            WHEN 4 THEN 'Четверг'
            WHEN 5 THEN 'Пятница'
            WHEN 6 THEN 'Суббота'
            WHEN 7 THEN 'Воскресенье'
        END as day_name,
        cs.lesson_number,
        cs.subject_name,
        COALESCE(cs.teacher_name, '') as teacher_name,
        COALESCE(cs.classroom, '') as classroom,
        cs.start_time,
        cs.end_time,
        cs.created_at,
        cs.updated_at
    FROM class_schedules cs
    WHERE cs.class_name = target_class_name
    ORDER BY cs.day_of_week, cs.lesson_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Создаем функцию для добавления/обновления урока в расписании (только для админа)
CREATE OR REPLACE FUNCTION upsert_schedule_lesson(
    target_class_name TEXT,
    target_day_of_week INTEGER,
    target_lesson_number INTEGER,
    target_subject_name TEXT,
    target_teacher_name TEXT DEFAULT NULL,
    target_classroom TEXT DEFAULT NULL,
    target_start_time TIME DEFAULT NULL,
    target_end_time TIME DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    lesson_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем права администратора
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = current_user_id
        AND p.email = 'rrzakirov11@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Access denied. Only admin can modify schedules';
    END IF;

    -- Валидация входных данных
    IF target_day_of_week < 1 OR target_day_of_week > 7 THEN
        RAISE EXCEPTION 'Invalid day_of_week. Must be between 1 and 7';
    END IF;

    IF target_lesson_number < 1 OR target_lesson_number > 10 THEN
        RAISE EXCEPTION 'Invalid lesson_number. Must be between 1 and 10';
    END IF;

    -- Обновляем или создаем урок
    INSERT INTO class_schedules (
        class_name,
        day_of_week,
        lesson_number,
        subject_name,
        teacher_name,
        classroom,
        start_time,
        end_time,
        created_by
    )
    VALUES (
        target_class_name,
        target_day_of_week,
        target_lesson_number,
        target_subject_name,
        target_teacher_name,
        target_classroom,
        target_start_time,
        target_end_time,
        current_user_id
    )
    ON CONFLICT (class_name, day_of_week, lesson_number)
    DO UPDATE SET
        subject_name = EXCLUDED.subject_name,
        teacher_name = EXCLUDED.teacher_name,
        classroom = EXCLUDED.classroom,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        updated_at = NOW()
    RETURNING id INTO lesson_id;

    RETURN lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Создаем функцию для удаления урока из расписания (только для админа)
CREATE OR REPLACE FUNCTION delete_schedule_lesson(
    target_class_name TEXT,
    target_day_of_week INTEGER,
    target_lesson_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем права администратора
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = current_user_id
        AND p.email = 'rrzakirov11@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Access denied. Only admin can modify schedules';
    END IF;

    DELETE FROM class_schedules
    WHERE class_name = target_class_name
    AND day_of_week = target_day_of_week
    AND lesson_number = target_lesson_number;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Создаем функцию для получения всех классов с расписаниями (только для админа)
CREATE OR REPLACE FUNCTION get_all_classes_with_schedules()
RETURNS TABLE (
    class_name TEXT,
    student_count BIGINT,
    lesson_count BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Проверяем права администратора
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.email = 'rrzakirov11@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Access denied. Only admin can view all class schedules';
    END IF;

    RETURN QUERY
    SELECT
        p.class_name,
        COUNT(DISTINCT p.id) as student_count,
        COUNT(DISTINCT cs.id) as lesson_count,
        MAX(cs.updated_at) as last_updated
    FROM profiles p
    LEFT JOIN class_schedules cs ON cs.class_name = p.class_name
    WHERE p.class_name IS NOT NULL AND p.class_name != ''
    GROUP BY p.class_name
    ORDER BY p.class_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_class_schedules_updated_at ON class_schedules;
CREATE TRIGGER update_class_schedules_updated_at
    BEFORE UPDATE ON class_schedules
    FOR EACH ROW EXECUTE FUNCTION update_schedule_updated_at();

-- 19. Назначаем роль admin пользователю rrzakirov11@gmail.com
UPDATE profiles
SET role = 'admin'
WHERE email = 'rrzakirov11@gmail.com';

-- 20. Создаем функцию для проверки прав администратора
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.email = 'rrzakirov11@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Class schedules system added successfully' as status;

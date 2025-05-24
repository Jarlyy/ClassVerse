-- Создание системы расписаний для классов

-- 1. Создаем таблицу расписаний для классов
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

-- 2. Включаем RLS для таблицы расписаний
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- 3. Создаем политики RLS для расписаний
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

-- 4. Создаем функцию для получения расписания класса
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

-- 5. Создаем функцию для добавления/обновления урока в расписании (только для админа)
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

-- 6. Создаем функцию для удаления урока из расписания (только для админа)
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

-- 7. Создаем функцию для получения всех классов с расписаниями (только для админа)
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

-- 8. Создаем триггер для автоматического обновления updated_at
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

-- 9. Назначаем роль admin пользователю rrzakirov11@gmail.com
UPDATE profiles
SET role = 'admin'
WHERE email = 'rrzakirov11@gmail.com';

-- 10. Создаем функцию для проверки прав администратора
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

-- 11. Создаем несколько примеров расписания для демонстрации
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Получаем ID администратора
    SELECT id INTO admin_id FROM profiles WHERE email = 'rrzakirov11@gmail.com';

    IF admin_id IS NOT NULL THEN
        -- Добавляем примеры расписания для класса 11А с правильным временем
        INSERT INTO class_schedules (class_name, day_of_week, lesson_number, subject_name, teacher_name, classroom, start_time, end_time, created_by)
        VALUES
            ('11А', 1, 1, 'Математика', 'Иванова А.П.', '305', '09:00', '09:45', admin_id),
            ('11А', 1, 2, 'Русский язык', 'Петрова М.И.', '201', '10:00', '10:45', admin_id),
            ('11А', 1, 3, 'Физика', 'Сидоров В.К.', '401', '11:00', '11:45', admin_id),
            ('11А', 1, 4, 'Химия', 'Белова Т.Н.', '302', '11:55', '12:40', admin_id),
            ('11А', 1, 5, 'История', 'Козлова Н.С.', '203', '13:00', '13:45', admin_id),
            ('11А', 2, 1, 'Литература', 'Петрова М.И.', '201', '09:00', '09:45', admin_id),
            ('11А', 2, 2, 'Биология', 'Морозова Е.А.', '302', '10:00', '10:45', admin_id),
            ('11А', 2, 3, 'География', 'Волков И.С.', '204', '11:00', '11:45', admin_id),
            ('11А', 2, 4, 'Английский язык', 'Смирнова О.В.', '105', '11:55', '12:40', admin_id)
        ON CONFLICT (class_name, day_of_week, lesson_number) DO NOTHING;

        RAISE NOTICE 'Примеры расписания добавлены для класса 11А';
    END IF;
END $$;

SELECT 'Class schedules system created successfully' as status;

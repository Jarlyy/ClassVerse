-- Политики для домашних заданий
CREATE POLICY "Домашние задания доступны всем аутентифицированным пользователям для чтения"
ON homework FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Только аутентифицированные пользователи могут создавать домашние задания"
ON homework FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Только создатели могут обновлять домашние задания"
ON homework FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Только создатели могут удалять домашние задания"
ON homework FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Политики для выполненных домашних заданий
CREATE POLICY "Пользователи могут видеть только свои выполненные задания"
ON completed_homework FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут отмечать задания как выполненные"
ON completed_homework FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут снимать отметки о выполнении"
ON completed_homework FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

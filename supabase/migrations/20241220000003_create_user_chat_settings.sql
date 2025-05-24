-- Создание таблицы настроек пользователя для чатов
CREATE TABLE user_chat_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    hidden BOOLEAN DEFAULT FALSE,
    cleared_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальная комбинация пользователя и канала
    UNIQUE(user_id, channel_id)
);

-- Включаем RLS
ALTER TABLE user_chat_settings ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view their own chat settings" ON user_chat_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat settings" ON user_chat_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat settings" ON user_chat_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat settings" ON user_chat_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Индексы для производительности
CREATE INDEX idx_user_chat_settings_user_id ON user_chat_settings(user_id);
CREATE INDEX idx_user_chat_settings_channel_id ON user_chat_settings(channel_id);
CREATE INDEX idx_user_chat_settings_hidden ON user_chat_settings(hidden);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_chat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_user_chat_settings_updated_at
    BEFORE UPDATE ON user_chat_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_chat_settings_updated_at();

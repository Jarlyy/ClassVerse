-- Простая система групп с подгруппами

-- Добавляем необходимые поля в таблицу channels
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS parent_channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS has_subgroups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_class_group BOOLEAN DEFAULT false;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_channels_parent ON channels(parent_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_has_subgroups ON channels(has_subgroups);
CREATE INDEX IF NOT EXISTS idx_channels_is_class_group ON channels(is_class_group);

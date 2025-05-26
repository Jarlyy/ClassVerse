import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useChatHistory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearChatHistory = async (channelId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('clear_channel_history', {
        channel_id: channelId
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error clearing chat history:', err);
      
      if (err.message?.includes('Access denied')) {
        setError('У вас нет прав для очистки истории этого чата');
      } else if (err.message?.includes('Channel not found')) {
        setError('Чат не найден');
      } else {
        setError(err.message || 'Ошибка при очистке истории чата');
      }
      
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    clearChatHistory,
  };
}

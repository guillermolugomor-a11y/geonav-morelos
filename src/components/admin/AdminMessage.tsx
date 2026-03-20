import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AdminMessageProps {
  message: { type: 'success' | 'error'; text: string } | null;
}

export const AdminMessage: React.FC<AdminMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className={`p-4 rounded-xl flex items-center gap-3 ${
        message.type === 'success'
          ? 'bg-[#8C3154]/5 text-[#8C3154] border border-[#8C3154]/20'
          : 'bg-[#7C4A36]/5 text-[#7C4A36] border border-[#7C4A36]/20'
      }`}
    >
      {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message.text}</span>
    </div>
  );
};

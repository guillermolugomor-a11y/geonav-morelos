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
          ? 'bg-primary/5 text-primary border border-primary/20'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message.text}</span>
    </div>
  );
};

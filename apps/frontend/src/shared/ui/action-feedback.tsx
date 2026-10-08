'use client';

import { useEffect, useState } from 'react';

export function ActionFeedback({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  return visible ? <p className="action-feedback" role="status">
    <span>{message}</span><button type="button" className="ghost-button" aria-label="Dispensar mensagem" onClick={() => setVisible(false)}>Fechar</button>
  </p> : null;
}

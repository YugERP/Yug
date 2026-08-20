import React, { useState, useEffect } from 'react';

export function DateTimeDisplay() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = `${String(dateTime.getDate()).padStart(2, '0')}/${String(dateTime.getMonth() + 1).padStart(2, '0')}/${dateTime.getFullYear()}`;

  return (
    <div className="text-[10px] text-slate-500 text-right">
      <p>{formattedDate}</p>
      <p className="font-mono">{dateTime.toLocaleTimeString()}</p>
    </div>
  );
}

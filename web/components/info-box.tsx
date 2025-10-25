import React from 'react';

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoBox({ title, children, className = "" }: InfoBoxProps) {
  return (
    <div className={`mt-12 p-8 bg-sand-1400 border border-border-low ${className}`}>
      <h2 className="text-title-4 mb-6 font-diatype-medium">{title}</h2>
      {children}
    </div>
  );
}

interface SecurityNoteProps {
  children: React.ReactNode;
}

export function SecurityNote({ children }: SecurityNoteProps) {
  return (
    <div className="mt-6 p-6 bg-sand-1300 border border-sand-1000">
      <h3 className="text-title-5 text-sand-100 mb-3 font-diatype-medium">Security Note</h3>
      <div className="text-body-md text-sand-400">
        {children}
      </div>
    </div>
  );
}


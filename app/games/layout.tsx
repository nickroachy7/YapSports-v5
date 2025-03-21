import React from 'react';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="games-layout">
      {/* The children will include the content of the page */}
      {/* The header comes from the root layout.tsx */}
      {children}
    </div>
  );
} 
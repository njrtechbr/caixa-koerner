import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">{title}</h1>
        {actions && <div className="ml-4">{actions}</div>}
      </div>
      {description && (
        typeof description === 'string' 
        ? <p className="mt-1 text-muted-foreground">{description}</p>
        : <div className="mt-1 text-muted-foreground">{description}</div>
      )}
    </div>
  );
}

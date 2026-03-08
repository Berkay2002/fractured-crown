import { useEffect } from 'react';

export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;

    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }

    return () => {
      document.title = 'Fractured Crown';
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute(
          'content',
          'Fractured Crown — a free multiplayer social deduction board game set in a dark fantasy kingdom. Play online with friends in real time.'
        );
      }
    };
  }, [title, description]);
}

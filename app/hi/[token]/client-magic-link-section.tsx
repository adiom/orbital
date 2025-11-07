'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClientMagicLinkSectionProps {
  token: string;
  email: string;
}

export function ClientMagicLinkSection({
  token,
  email,
}: ClientMagicLinkSectionProps) {
  const router = useRouter();

  useEffect(() => {
    // Автоматический редирект через 3 секунды
    const timer = setTimeout(() => {
      router.push(
        `/login?magic_token=${token}&magic_email=${encodeURIComponent(email)}`,
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [token, email, router]);

}

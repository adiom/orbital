'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IPDisplay } from '@/components/ip-display';

export default function ClientMagicLinkSection({
  token,
  email,
}: { token: string; email: string }) {
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

  return <IPDisplay />;
}

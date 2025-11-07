'use client';

import { useState, useActionState, startTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createMagicLink,
  type CreateMagicLinkState,
} from '@/app/(auth)/actions';
import { Key, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MagicLinkFormProps {
  onFocus?: () => void;
  onBlur?: () => void;
}

export function MagicLinkForm({ onFocus, onBlur }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [state, formAction] = useActionState<CreateMagicLinkState, FormData>(
    createMagicLink,
    {
      status: 'idle',
    },
  );

  const isSuccess = state.status === 'success';
  const isLoading = state.status === 'in_progress';
  const magicLink = state.magicLink;
  const isDev = process.env.NODE_ENV === 'development';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', email);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-code-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        await updateSession();
        router.push('/');
      } else {
        console.error(data.error || 'Неверный код');
      }
    } catch (_error) {
      console.error('Ошибка верификации кода');
    }
  };

  // Показываем ввод кода в dev режиме
  if (isSuccess && magicLink && !showCodeInput) {
    return (
      <div className="space-y-4 text-center px-4 sm:px-16">

        <div className="space-y-3">
          <Button onClick={() => setShowCodeInput(true)} className="w-full">
            Ввести код вручную
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmail('');
              setShowCodeInput(false);
              window.location.reload();
            }}
            className="w-full"
          >
            Создать новый код
          </Button>
        </div>
      </div>
    );
  }

  // Форма ввода кода в dev режиме
  if (showCodeInput && isDev) {
    return (
      <div className="space-y-4 px-4 sm:px-16">
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="code" className="text-sm font-medium">
              Код из консоли сервера
            </Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345678"
              maxLength={8}
              required
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button type="submit" className="w-full">
            <Loader2
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Войти по коду
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCodeInput(false)}
          className="w-full"
        >
          Назад
        </Button>
      </div>
    );
  }

  if (isSuccess) {

    
    return (
      <div className="space-y-4 text-center px-4 sm:px-16">
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <div className="text-sm text-green-700 dark:text-green-200">
            ✅ Magic link создан для {email}
          </div>
        </div>

        {magicLink ? (
          <div className="space-y-3">
            <Button onClick={() => setShowCodeInput(true)} className="w-full">
              Ввести код вручную
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Проверьте почту и перейдите по ссылке для входа
            </p>
            <Button
              type="button"
              onClick={() => {
                window.location.href = magicLink || '#';
              }}
              className="w-full"
              disabled={!magicLink}
            >
              Открыть Magic Link
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEmail('');
            setShowCodeInput(false);
            window.location.reload();
          }}
          className="w-full"
        >
          Создать новую ссылку
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 sm:px-16">
      <div className="space-y-1">
        <Label htmlFor="magic-email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
          disabled={isLoading}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Создание ссылки...' : 'Создать Magic Link'}
      </Button>
    </form>
  );
}

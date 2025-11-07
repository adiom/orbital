'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { JSX } from 'react';
import {
  useActionState,
  useEffect,
  useState,
  startTransition,
  Suspense,
} from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import { MagicLinkForm } from '@/components/magic-link-form';
import { Button } from '@/components/ui/button';

import { login, loginWithMagicLink, type LoginActionState } from '../actions';
import { signIn, useSession } from 'next-auth/react';


function LoginContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const [magicState, magicFormAction] = useActionState<
    LoginActionState,
    FormData
  >(loginWithMagicLink, {
    status: 'idle',
  });

  const { status, update: updateSession } = useSession();
  const [loginTriggered, setLoginTriggered] = useState(false);
  const [successHandled, setSuccessHandled] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const rawCookies = document.cookie.split(';');

    for (const cookie of rawCookies) {
      const separatorIndex = cookie.indexOf('=');
      const name = (
        separatorIndex > -1 ? cookie.slice(0, separatorIndex) : cookie
      ).trim();

      if (!name) {
        continue;
      }

      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }, [status]);



  useEffect(() => {
    const magicToken = searchParams.get('magic_token');

    if (magicToken && !loginTriggered) {
      setLoginTriggered(true);

      // Верифицируем magic token через signIn
      signIn('credentials', {
        token: magicToken,
        redirect: false,
      })
        .then((result) => {
          if (result?.ok) {
            updateSession();
            router.push('/orbits');
          } else {
            console.error('Invalid magic token');
          }
        })
        .catch((error) => {
          console.error('Error verifying magic token:', error);
        });
    }
  }, [searchParams, loginTriggered, updateSession, router]);



  useEffect(() => {
    if (state.status === 'success' && !successHandled) {
      setSuccessHandled(true);
      updateSession();
      router.push('/orbits');
    }
  }, [state.status, updateSession, router, successHandled]);

  useEffect(() => {
    if (magicState.status === 'success' && !successHandled) {
      setSuccessHandled(true);
      updateSession();
      router.push('/orbits');
    }
  }, [magicState.status, updateSession, router, successHandled]);

  return (
    <div className="relative flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background overflow-hidden">
      {/* Background animations around login form */}
      <motion.div
        className="absolute w-full h-full z-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFocused ? 1 : 0.3 }}
        transition={{
          duration: 0.8,
        }}
      >
        
      </motion.div>

      <motion.div
        className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 z-10 shadow-lg border border-orange-200/50 dark:border-slate-600/50"
          animate={{
            borderColor: isFocused ? '#f97316' : '#fed7aa', // Orange-500 : Orange-200
            boxShadow: isFocused
              ? '0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
          transition={{
            duration: 0.6,
            delay: 0.1,
          }}
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          <MagicLinkForm
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => signIn('yandex')}
          >
            Войти через Яндекс
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <LoginContent />
    </Suspense>
  );
}

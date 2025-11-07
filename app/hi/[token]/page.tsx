import { redirect } from 'next/navigation';
import { validateMagicToken } from './actions';
import { ClientMagicLinkSection } from './client-magic-link-section';

type MagicLinkPageProps = {
  params: Promise<{ token: string }>;
};

export default async function MagicLinkPage({ params }: MagicLinkPageProps) {
  // Внимание: здесь должен быть await
  const { token } = await params;

  if (!token) {
    redirect('/login?error=invalid_token');
  }

  // Валидация токена на сервере
  const tokenData = await validateMagicToken(token);

  if (!tokenData) {
    redirect('/login?error=invalid_token');
  }

  const { email } = tokenData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">🔗 Magic Link</h1>
        <p className="text-xl mb-8">Авторизация успешна!</p>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-lg mb-2">Email: {email}</p>
          <p className="text-sm text-gray-300">
            Перенаправление через 3 секунды...
          </p>
        </div>
        <div className="text-sm text-gray-400">
          Если редирект не произошел,
          <a
            href={`/login?magic_token=${token}&magic_email=${encodeURIComponent(email)}`}
            className="text-blue-400 hover:text-blue-300 underline ml-1"
          >
            нажмите здесь
          </a>
        </div>
      </div>

      {/* Используем клиентский компонент для IPDisplay и редиректа */}
      <ClientMagicLinkSection token={token} email={email} />
    </div>
  );
}

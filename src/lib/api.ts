import { auth } from '../firebase';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const token = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}


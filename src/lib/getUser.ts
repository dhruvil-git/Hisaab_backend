export async function getUser(token: string | null) {
  if (!token) throw new Error('Missing token');

  const res = await fetch('http://localhost:3001/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch user');
  }

  return await res.json();
}

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const userData = await request.json();

		if (!userData.access_token || !userData.id_token) {
			return json({ error: 'Invalid token data' }, { status: 400 });
		}

		// Set session cookie
		cookies.set(
			'session',
			JSON.stringify({
				access_token: userData.access_token,
				id_token: userData.id_token,
				profile: userData.profile
			}),
			{
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 // 24 hours
			}
		);

		return json({ status: 'success' });
	} catch (error) {
		console.error('Session creation error:', error);
		return json({ error: 'Failed to create session' }, { status: 500 });
	}
};

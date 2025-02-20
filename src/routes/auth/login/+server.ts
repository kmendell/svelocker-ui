import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const params = new URLSearchParams({
		client_id: env.PUBLIC_OIDC_CLIENT_ID,
		redirect_uri: env.PUBLIC_OIDC_REDIRECT_URI,
		response_type: 'code',
		scope: 'openid email profile',
		state: crypto.randomUUID() // Generate a random state
	});

	const authUrl = `${env.PUBLIC_OIDC_ISSUER}/authorize?${params.toString()}`;
	throw redirect(302, authUrl);
};

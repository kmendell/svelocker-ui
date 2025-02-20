import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const storedState = cookies.get('oidc_state');
	const returnedState = url.searchParams.get('state');

	// Verify state parameter matches
	if (!storedState || !returnedState || storedState !== returnedState) {
		return {
			error: 'Invalid state parameter'
		};
	}

	return {
		url: url.toString(),
		code: url.searchParams.get('code'),
		state: returnedState
	};
};

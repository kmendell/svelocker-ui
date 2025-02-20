import { RegistrySyncService } from '$lib/services/sync';
import type { Handle } from '@sveltejs/kit';

// Initialize sync service when server starts
RegistrySyncService.getInstance().start();

export const handle: Handle = async ({ event, resolve }) => {
	// Public paths that don't require authentication
	const publicPaths = ['/login', '/auth/login', '/auth/callback'];

	// Check for auth token in session
	const session = event.cookies.get('session');

	// Add user to event.locals
	event.locals.user = session ? JSON.parse(session) : null;

	// Allow access to public paths
	if (publicPaths.some((path) => event.url.pathname.startsWith(path))) {
		return resolve(event);
	}

	// Protect all other routes
	if (!event.locals.user) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/login' }
		});
	}

	return resolve(event);
};

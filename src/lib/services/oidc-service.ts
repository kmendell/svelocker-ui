import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts';
import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

export class OIDCLoginService {
	private static instance: OIDCLoginService;
	private userManager: UserManager | null = null;

	private constructor() {
		if (browser) {
			Log.setLogger(console);
			Log.setLevel(Log.DEBUG);

			const settings = {
				authority: env.PUBLIC_OIDC_ISSUER,
				client_id: env.PUBLIC_OIDC_CLIENT_ID,
				redirect_uri: env.PUBLIC_OIDC_REDIRECT_URI,
				response_type: 'code',
				scope: 'openid email profile',
				loadUserInfo: true,
				automaticSilentRenew: false,
				includeIdTokenInSilentRenew: false,
				monitorSession: false,
				stateStore: new WebStorageStateStore({
					store: window.localStorage
				}),
				userStore: new WebStorageStateStore({
					store: window.localStorage
				})
			};

			this.userManager = new UserManager(settings);
		}
	}

	public static getInstance(): OIDCLoginService {
		if (!OIDCLoginService.instance) {
			OIDCLoginService.instance = new OIDCLoginService();
		}
		return OIDCLoginService.instance;
	}

	public async login(): Promise<void> {
		if (!browser || !this.userManager) {
			throw new Error('UserManager not initialized');
		}

		try {
			// Generate a unique state
			const state = crypto.randomUUID();

			// Store the state in localStorage
			localStorage.setItem('oidc_state', state);

			await this.userManager.signinRedirect({
				state,
				extraQueryParams: {
					prompt: 'login'
				}
			});
		} catch (error) {
			console.error('Login failed:', error);
			throw error;
		}
	}

	public async handleCallback(code: string | null): Promise<any> {
		if (!browser || !this.userManager) {
			throw new Error('UserManager not initialized');
		}

		try {
			// Use signinRedirectCallback instead of signinCallback
			const user = await this.userManager.signinRedirectCallback();
			return user;
		} catch (error) {
			console.error('OIDC callback error:', error);
			throw error;
		}
	}
}

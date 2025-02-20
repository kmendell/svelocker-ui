<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { OIDCLoginService } from '$lib/services/oidc-service';
	import type { PageData } from './$types';

	export let data: PageData;
	let error: string | null = data.error || null;
	let processing = !data.error;

	onMount(async () => {
		if (data.error) {
			setTimeout(() => goto('/login?error=' + encodeURIComponent(data.error)), 3000);
			return;
		}

		try {
			const oidcService = OIDCLoginService.getInstance();
			const user = await oidcService.handleCallback(data.code);

			const response = await fetch('/auth/session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(user)
			});

			if (!response.ok) {
				throw new Error('Failed to create session');
			}

			goto('/');
		} catch (err) {
			console.error('Auth callback error:', err);
			error = err instanceof Error ? err.message : 'Authentication failed';
			setTimeout(() => goto('/login?error=' + encodeURIComponent(error || '')), 3000);
		} finally {
			processing = false;
		}
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	{#if processing}
		<p>Processing authentication...</p>
	{:else if error}
		<p class="text-red-500">Error: {error}</p>
		<p class="text-sm">Redirecting to login...</p>
	{/if}
</div>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { env } from '$env/dynamic/public';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import { Lock, User, LogIn } from 'lucide-svelte';

	let username = '';
	let password = '';

	async function handleLogin() {
		try {
			// TODO: Implement actual login logic
			if (!username || !password) {
				toast.error('Please fill in all fields');
				return;
			}

			toast.success('Login successful');
		} catch (error) {
			toast.error('Login failed');
		}
	}

	async function handleOIDCLogin() {
		try {
			// TODO: Implement OIDC login logic
			window.location.href = '/auth/login';
			toast.info('Redirecting to OIDC provider...');
		} catch (error) {
			toast.error('OIDC login failed');
		}
	}
	const showLocalLogin = env.PUBLIC_DISABLE_LOCAL_LOGIN !== 'true';
</script>

<svelte:head>
	<title>Login - {env.PUBLIC_REGISTRY_NAME}</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center bg-muted/50">
	<div class="w-full max-w-md p-8 space-y-6 bg-background rounded-lg shadow-lg border">
		<div class="space-y-2 text-center">
			<h1 class="text-2xl font-semibold tracking-tight">Login</h1>
			<p class="text-sm text-muted-foreground">
				Login to access {env.PUBLIC_REGISTRY_NAME}
			</p>
		</div>

		<form class="space-y-4" on:submit|preventDefault={handleLogin}>
			{#if showLocalLogin}
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<div class="relative">
						<User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input id="username" type="text" placeholder="Enter your username" class="pl-10" bind:value={username} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<div class="relative">
						<Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input id="password" type="password" placeholder="Enter your password" class="pl-10" bind:value={password} />
					</div>
				</div>

				<Button type="submit" class="w-full">Sign In</Button>
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<Separator class="w-full" />
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-background px-2 text-muted-foreground">Or continue with</span>
					</div>
				</div>
			{/if}

			<Button type="button" variant="outline" class="w-full" onclick={handleOIDCLogin}>
				<LogIn class="mr-2 h-4 w-4" />
				Sign in with OIDC
			</Button>
		</form>

		<!-- <div class="text-center text-sm text-muted-foreground">
			<p>Protected by {env.PUBLIC_REGISTRY_NAME}</p>
		</div> -->
	</div>
</div>

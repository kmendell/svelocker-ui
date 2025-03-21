<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { env } from '$env/dynamic/public';

	let collecting = false;

	async function runGarbageCollect() {
		collecting = true;
		try {
			const response = await fetch('/api/garbage-collect', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to run garbage collection');
			}

			const result = await response.json();

			if (result.success) {
				toast.success('Garbage collection completed', {
					description: 'Registry storage has been cleaned up'
				});
			} else {
				toast.error('Garbage collection failed', {
					description: result.error || 'Failed to clean up registry storage'
				});
			}
		} catch (error) {
			toast.error('Garbage collection failed', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred'
			});
		} finally {
			collecting = false;
		}
	}
</script>

{#if env.PUBLIC_ENABLE_GARBAGE_COLLECT === 'true'}
	<Button onclick={runGarbageCollect} disabled={collecting}>
		{#if collecting}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			<span>Collecting...</span>
		{:else}
			<Trash2 class="mr-2 h-4 w-4" />
			<span>Garbage Collect</span>
		{/if}
	</Button>
{/if}

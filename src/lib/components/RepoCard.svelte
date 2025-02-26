<script lang="ts">
	import CollapsibleCard from '$lib/components/dropdown-card.svelte';
	import RepoImage from '$lib/components/docker-metadata/RepoImage.svelte';
	import type { Namespace } from '$lib/types/namespace.type';

	// Make the prop accept either old or new model
	export let namespaces: Namespace[] = [];

	// Safe property access with null checks
	$: groupedData = (namespaces || []).reduce(
		(acc, namespace) => {
			// Handle null or undefined namespace
			if (!namespace) return acc;

			const name = namespace.name || 'unknown';
			if (!acc[name]) {
				acc[name] = [];
			}
			acc[name].push(namespace);
			return acc;
		},
		{} as Record<string, Namespace[]>
	);
</script>

<div data-testid="repo-card" class="grid grid-cols-1 md:grid-cols-1 gap-4 p-10">
	{#if Object.keys(groupedData).length > 0}
		{#each Object.entries(groupedData) as [namespaceName, namespaceGroup]}
			<CollapsibleCard id={namespaceName} title={namespaceName} description={`${namespaceGroup[0]?.images?.length || 0} ${namespaceGroup[0]?.images?.length !== 1 ? 'Images' : 'Image'} Found`}>
				{#each namespaceGroup as namespace, index}
					{#if namespace && namespace.images && namespace.images.length > 0}
						<RepoImage namespaceIndex={index} namespaces={[namespace]} />
					{:else}
						<div class="p-4 text-muted-foreground">No images found in this namespace</div>
					{/if}
				{/each}
				<div class="clearfix"></div>
			</CollapsibleCard>
		{/each}
	{:else}
		<div class="p-4 text-muted-foreground">No namespaces available</div>
	{/if}
</div>

<script lang="ts">
	import CollapsibleCard from '$lib/components/dropdown-card.svelte';
	import RepoImage from '$lib/components/docker-metadata/RepoImage.svelte';
	import type { RegistryRepo } from '$lib/models/repo.ts';

	export let filteredData: RegistryRepo[];

	// Group the data by repo name
	$: groupedData = filteredData.reduce(
		(acc, repo) => {
			const name = repo.name;
			if (!acc[name]) {
				acc[name] = [];
			}
			acc[name].push(repo);
			return acc;
		},
		{} as Record<string, RegistryRepo[]>
	);
</script>

<div data-testid="repo-card" class="grid grid-cols-1 md:grid-cols-1 gap-4 p-10">
	{#each Object.entries(groupedData) as [repoName, repos]}
		<CollapsibleCard id={repoName} title={repoName} description={`${repos[0].images.length} ${repos[0].images.length > 1 ? 'Images' : 'Image'} Found`}>
			{#each repos as repo, index}
				<RepoImage repoIndex={index} filteredData={[repo]} />
			{/each}
			<div class="clearfix"></div>
		</CollapsibleCard>
	{/each}
</div>

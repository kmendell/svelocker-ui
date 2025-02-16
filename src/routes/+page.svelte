<script lang="ts">
	import RepoCard from '$lib/components/RepoCard.svelte';
	import { writable, derived } from 'svelte/store';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Search } from 'lucide-svelte';
	import type { PageProps } from './$types';
	import { env } from '$env/dynamic/public';

	let { data }: PageProps = $props();
	const searchQuery = writable('');

	// Constants
	const ITEMS_PER_PAGE = 5;
	const currentPage = writable(1);

	// Create a store for the repositories
	const repositories = writable(data.repos.repositories);

	// Filter data based on search
	const filteredData = derived([repositories, searchQuery], ([$repositories, $searchQuery]) => $repositories.filter((repo) => repo.name.toLowerCase().includes($searchQuery.toLowerCase())));

	// Update total pages based on filtered data
	const totalPages = derived(filteredData, ($filteredData) => Math.ceil($filteredData.length / ITEMS_PER_PAGE));

	// Compute paginated data from filtered results
	const paginatedData = derived([filteredData, currentPage], ([$filteredData, $currentPage]) => $filteredData.slice(($currentPage - 1) * ITEMS_PER_PAGE, $currentPage * ITEMS_PER_PAGE));

	function prevPage() {
		currentPage.update((n) => Math.max(1, n - 1));
	}

	function nextPage() {
		currentPage.update((n) => Math.min($totalPages, n + 1));
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= $totalPages) {
			currentPage.set(page);
		}
	}
</script>

<svelte:head>
	<title>Svelocker UI</title>
</svelte:head>

<div class="flex-1 w-full flex-col justify-between bg-muted/50">
	{#if $repositories.length > 0}
		<div class="flex justify-between items-center px-10 pt-10">
			<h2 class="text-2xl">
				Found {$filteredData.length} Images in {env.PUBLIC_REGISTRY_NAME}
			</h2>
			<div class="relative w-[250px]">
				<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input type="search" placeholder="Search repositories/images..." class="pl-8" bind:value={$searchQuery} />
			</div>
		</div>
		{#if $filteredData.length > 0}
			<!-- RepoCard List -->
			<div class="grid grid-cols-1 gap-4" style="margin-bottom: 2em;">
				<RepoCard filteredData={$paginatedData} />
			</div>

			<!-- Pagination Component -->
			<Pagination.Root count={$filteredData.length} perPage={ITEMS_PER_PAGE} class="sticky-bottom-0 z-10 pagination-footer ">
				{#snippet children({ pages })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton onclick={prevPage} />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={$currentPage === page.value} onclick={() => goToPage(page.value)}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton onclick={nextPage} />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		{:else}
			<div class="grid place-items-center h-[50vh]">
				<div class="text-center">
					<h3 class="text-xl text-muted-foreground">No matches found matching "{$searchQuery}"</h3>
					<p class="text-sm text-muted-foreground mt-2">Try adjusting your search terms</p>
				</div>
			</div>
		{/if}
	{:else}
		<div class="grid grid-cols-1 gap-4 p-10">
			<h2 class="text-lg poppins">Could not pull registry data...</h2>
		</div>
	{/if}
</div>

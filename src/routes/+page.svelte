<script lang="ts">
	import NamespaceCard from '$lib/components/RepoCard.svelte';
	import { writable, derived } from 'svelte/store';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Search, AlertCircle } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { env } from '$env/dynamic/public';
	import SyncButton from '$lib/components/SyncButton.svelte';
	import type { Namespace } from '$lib/types/namespace.type';

	export let data: PageData;

	// Safely access data properties
	$: isHealthy = data?.healthStatus?.isHealthy ?? false;

	const searchQuery = writable('');

	// Constants for pagination
	const ITEMS_PER_PAGE = 5;
	const currentPage = writable(1);

	// Initialize namespace store with safe default
	const namespaces = writable<Namespace[]>(data?.namespaces || []);

	// Update store when data changes
	$: {
		if (data?.namespaces) {
			namespaces.set(data.namespaces);
		}
	}

	// Safe filtering with null checks
	const filteredData = derived([namespaces, searchQuery], ([$namespaces, $searchQuery]) => {
		return ($namespaces || []).filter((namespace) => {
			if (!namespace) return false;

			const searchTerms = ($searchQuery || '').toLowerCase();
			// Search in both namespace name and image names
			return (namespace.name || '').toLowerCase().includes(searchTerms) || (namespace.images || []).some((img) => img && (img.name || '').toLowerCase().includes(searchTerms));
		});
	});

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

<div class="mx-auto py-6 flex-1 w-full flex-col bg-muted/50">
	{#if data?.error}
		<div class="flex items-center ml-10 mr-10 gap-2 p-4 border rounded-lg bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800">
			<AlertCircle size={20} class="text-red-600 dark:text-red-400" />
			<p class="text-red-600 dark:text-red-400 font-medium">
				Unable to connect to registry at {env.PUBLIC_REGISTRY_URL}. Please check your connection and registry status.
			</p>
		</div>
	{/if}

	{#if data?.namespaces !== undefined}
		<div class="flex-1 w-full flex-col justify-between">
			{#if $namespaces && $namespaces.length > 0}
				<div class="flex justify-between items-start px-10 pt-10">
					<div class="space-y-2">
						<h2 class="text-2xl">
							Found {$filteredData.length}
							{$filteredData.length === 1 ? 'Namespace' : 'Namespaces'} in {env.PUBLIC_REGISTRY_NAME}
						</h2>
						{#if isHealthy !== undefined}
							<div class="flex items-center gap-2">
								<div class="w-2 h-2 rounded-full {isHealthy ? 'bg-green-500' : 'bg-red-500'}"></div>
								<span class="text-sm text-muted-foreground">
									Registry {isHealthy ? 'Healthy' : 'Unhealthy'}
								</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-4">
						<SyncButton />
						<div class="relative w-[250px]">
							<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input type="search" placeholder="Search namespaces..." class="pl-8" bind:value={$searchQuery} />
						</div>
					</div>
				</div>
				{#if $filteredData.length > 0}
					<!-- NamespaceCard List -->
					<div class="grid grid-cols-1 gap-4" style="margin-bottom: 2em;">
						<NamespaceCard namespaces={$paginatedData} />
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
	{:else}
		<div class="grid grid-cols-1 gap-4 p-10">
			<h2 class="text-lg poppins">Loading registry data...</h2>
		</div>
	{/if}
</div>

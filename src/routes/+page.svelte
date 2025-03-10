<script lang="ts">
	import RepoCard from '$lib/components/RepoCard.svelte';
	import { writable } from 'svelte/store';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Search, AlertCircle } from 'lucide-svelte';
	import type { PageProps } from './$types';
	import { env } from '$env/dynamic/public';
	import SyncButton from '$lib/components/SyncButton.svelte';
	import GarbageCollectButton from '$lib/components/GarbageCollectButton.svelte';
	import type { RegistryRepo } from '$lib/models/repo';
	import { onMount } from 'svelte';
	import { lastSyncTimestamp, isSyncing } from '$lib/stores/sync-store';

	let { data }: PageProps = $props();
	const isHealthy = data.healthStatus.isHealthy;
	const searchQuery = writable('');

	// Store for loaded data
	const repositories = writable<RegistryRepo[]>([]);
	const isLoading = writable(true);
	const totalCount = writable(data.repoMetadata?.count || 0);

	// Constants
	const ITEMS_PER_PAGE = 5;
	const currentPage = writable(1);

	// Load data from API based on current page and search
	async function loadPageData() {
		isLoading.set(true);
		try {
			const response = await fetch(`/api/repositories?page=${$currentPage}&limit=${ITEMS_PER_PAGE}&search=${$searchQuery}`);
			const data = await response.json();
			repositories.set(data.repositories);
			totalCount.set(data.totalCount);
		} catch (error) {
			console.error('Failed to load repositories:', error);
		} finally {
			isLoading.set(false);
		}
	}

	// Reactive values using runes
	const filteredData = $derived($repositories);
	const totalPages = $derived(Math.ceil($totalCount / ITEMS_PER_PAGE));

	// Handle page navigation
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

	// Reactively load data when page or search changes
	$effect(() => {
		if ($currentPage || $searchQuery !== undefined) {
			loadPageData();
		}
	});

	// Listen for sync completion and reload data
	$effect(() => {
		if ($lastSyncTimestamp) {
			console.log('Sync completed, refreshing data...');
			loadPageData();
		}
	});

	// Initial data load
	onMount(() => {
		loadPageData();
	});
</script>

<svelte:head>
	<title>Svelocker UI</title>
</svelte:head>

<div class="mx-auto py-6 flex-1 w-full flex-col bg-muted/50">
	{#if data.error}
		<div class="flex items-center ml-10 mr-10 gap-2 p-4 border rounded-lg bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800">
			<AlertCircle size={20} class="text-red-600 dark:text-red-400" />
			<p class="text-red-600 dark:text-red-400 font-medium">Unable to connect to registry at {env.PUBLIC_REGISTRY_URL}. Please check your connection and registry status.</p>
		</div>
	{/if}
	<div class="flex-1 w-full flex-col justify-between">
		<div class="flex justify-between items-start px-10 pt-10">
			<div class="space-y-2">
				<h2 class="text-2xl">
					Found {$totalCount}
					{$totalCount === 1 ? 'Repository' : 'Repositories'} in {env.PUBLIC_REGISTRY_NAME}
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
        	  {#if env.PUBLIC_ENABLE_GARBAGE_COLLECT === 'true'}
							<GarbageCollectButton />
						{/if}
				<div class="relative w-[250px]">
					<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input type="search" placeholder="Search repositories..." class="pl-8" bind:value={$searchQuery} />
				</div>
			</div>
		</div>

		{#if $isLoading}
			<div class="grid place-items-center h-[50vh]">
				<div class="text-center">
					<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
					<p class="mt-2 text-sm text-muted-foreground">Loading repositories...</p>
				</div>
			</div>
		{:else if $repositories.length > 0}
			<!-- RepoCard List -->
			<div class="grid grid-cols-1 gap-4" style="margin-bottom: 2em;">
				<RepoCard filteredData={$repositories} />
			</div>

			<!-- Pagination Component -->
			<Pagination.Root count={$totalCount} perPage={ITEMS_PER_PAGE} class="sticky-bottom-0 z-10 pagination-footer">
				{#snippet children({ pages })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton onclick={prevPage} disabled={$isSyncing} />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={$currentPage === page.value} onclick={() => goToPage(page.value)} disabled={$isSyncing}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton onclick={nextPage} disabled={$isSyncing} />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		{:else if $searchQuery}
			<div class="grid place-items-center h-[50vh]">
				<div class="text-center">
					<h3 class="text-xl text-muted-foreground">No matches found matching "{$searchQuery}"</h3>
					<p class="text-sm text-muted-foreground mt-2">Try adjusting your search terms</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 p-10">
				<h2 class="text-lg poppins">No repositories found in registry</h2>
			</div>
		{/if}
	</div>
</div>

<!-- Add an indicator when sync is in progress -->
{#if $isSyncing}
	<div class="fixed bottom-4 right-4 bg-accent p-2 rounded-md shadow-lg text-accent-foreground z-50">
		<div class="flex items-center gap-2">
			<RefreshCw class="animate-spin h-4 w-4" />
			<span class="text-sm">Syncing registry...</span>
		</div>
	</div>
{/if}

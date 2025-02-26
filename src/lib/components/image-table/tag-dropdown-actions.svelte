<script lang="ts">
	import { Tag } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import type { Tag as ImageTag } from '$lib/types/tag.type';
	import { derived } from 'svelte/store';
	import { readable } from 'svelte/store';

	export let tags: ImageTag[] = [];
	export let namespace: string = '';
	export let imageFullName: string = '';
	export let imageName: string = '';

	const tagsStore = readable(tags || []);

	// Sort tags reactively to keep 'latest' at the top
	const sortedTags = derived(tagsStore, ($tags) => {
		return [...($tags || [])].sort((a, b) => {
			if (!a || !b) return 0;
			if (a.name === 'latest') return -1;
			if (b.name === 'latest') return 1;
			return (a.name || '').localeCompare(b.name || '');
		});
	});

	// Safe tag count accessor
	$: tagCount = tags?.length || 0;
	$: firstTagName = tags?.[0]?.name || 'Tags';
	// Generate a unique ID for this dropdown
	const dropdownId = `tag-dropdown-${imageFullName.replace(/[^\w]/g, '-')}`;
</script>

<div data-testid={`tag-button-${imageName}`} class="flex items-center space-x-2">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button data-testid={`tag-button-${imageName}`} data-dropdown-id={dropdownId} variant="ghost" size="icon" class="relative size-8 p-0">
				<span class="sr-only">Open menu</span>
				<Tag />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-56" data-testid={`dropdown-content-${imageName}`} align="start">
			<DropdownMenu.Label class="font-bold flex items-center justify-center">Select a Tag</DropdownMenu.Label>
			<DropdownMenu.Separator />
			{#if $sortedTags.length > 0}
				{#each $sortedTags as tag}
					{#if tag && tag.name}
						<DropdownMenu.Item role="menuitem" class="font-bold flex items-center justify-center ">
							<a href="/details/{imageName}/{tag.name}" class={tag.name === 'latest' ? 'text-green-400' : ''}>
								{tag.name}
							</a>
						</DropdownMenu.Item>
					{:else}
						<DropdownMenu.Item disabled>No tags available</DropdownMenu.Item>
					{/if}
				{/each}
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

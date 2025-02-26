<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import type { ColumnDef } from '@tanstack/table-core';
	import { getCoreRowModel } from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import type { Namespace } from '$lib/types/namespace.type';
	import type { Image } from '$lib/types/image.type';
	import TagDropdownActions from '../image-table/tag-dropdown-actions.svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';

	export let namespaceIndex: number = 0;
	export let namespaces: Namespace[] = [];

	// Add namespace to the Image type for the table
	interface ExtendedImage extends Image {
		namespace?: string;
	}

	const columns: ColumnDef<ExtendedImage>[] = [
		{
			accessorKey: 'name',
			header: 'Name'
		},
		{
			accessorKey: 'fullName',
			header: 'Full Path'
		},
		{
			id: 'actions',
			header: 'Tags',
			cell: ({ row }) => {
				const image = row.original;
				return renderComponent(TagDropdownActions, {
					tags: image.tags || [],
					namespace: image.namespace || '',
					imageFullName: image.fullName || '',
					imageName: image.name || ''
				});
				// return {
				// 	renderComponent(TagDropdownActions,
				// 	props: {
				// 		tags: image.tags || [],
				// 		namespace: namespace?.name || '',
				// 		imageFullName: image.fullName || '',
				// 		imageName: image.name || ''
				// 	}
				// });
			}
		}
	];

	$: namespace = namespaces?.[namespaceIndex] || { name: '', images: [] };

	// Ensure the namespace property is added to each image
	$: tableData = (namespace?.images || []).map((image) => ({
		...image,
		namespace: namespace.name || ''
	}));

	const table = createSvelteTable({
		get data() {
			return tableData;
		},
		columns,
		getCoreRowModel: getCoreRowModel()
	});

	// Update the table when data changes
	$: {
		if (namespace) {
			table.setOptions((prev) => ({
				...prev,
				data: tableData
			}));
		}
	}

	// const table = createSvelteTable({
	// 	get data() {
	// 		return (namespace?.images || []).map((image) => ({
	// 			...image,
	// 			namespace: namespace.name || ''
	// 		}));
	// 	},
	// 	columns,
	// 	getCoreRowModel: getCoreRowModel()
	// });

	// $: {
	// 	if (namespace) {
	// 		table.setOptions((prev) => ({
	// 			...prev,
	// 			data: (namespace.images || []).map((image) => ({
	// 				...image,
	// 				namespace: namespace.name || ''
	// 			}))
	// 		}));
	// 	}
	// }
</script>

<!-- Use a more straightforward table layout for better reliability -->
<div class="relative overflow-x-auto border shadow-md sm:rounded-lg">
	{#if namespace?.images?.length > 0}
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head>
								{#if !header.isPlaceholder}
									<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row data-state={row.getIsSelected() && 'selected'} data-testid="image-row" data-image-name={row.original.name}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{:else}
		<div class="p-4 text-center text-muted-foreground">No images found in this namespace.</div>
	{/if}
</div>

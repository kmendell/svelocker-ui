import type { RepoImage } from '$lib/types/image';
import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import TagDropdownActions from '$lib/components/image-table/tag-dropdown-actions.svelte';

// Extend RepoImage type to include the new properties
type ExtendedRepoImage = RepoImage & {
	repo: string;
	repoIndex: number;
};

export const columns: ColumnDef<ExtendedRepoImage>[] = [
	{
		accessorKey: 'name',
		header: 'Image Name'
	},
	{
		accessorKey: 'fullName',
		header: 'Full Name'
	},
	{
		id: 'tags',
		header: 'Tags',
		cell: ({ row }) => {
			return renderComponent(TagDropdownActions, {
				tags: row.original.tags,
				data: row.original,
				imageFullName: row.original.fullName,
				imageName: row.original.name
			});
		}
	}
];

// src/lib/models/api.ts
import type { Namespace } from './namespace.type';

export type RegistryResponse = {
	/**
	 * List of repositories
	 */
	repositories: string[];
};

export type TagsListResponse = {
	/**
	 * Name of the repository
	 */
	name: string;

	/**
	 * List of tags
	 */
	tags: string[];
};

export type RegistryRepos = {
	/**
	 * Namespaces with their images
	 */
	repositories: Namespace[];
};

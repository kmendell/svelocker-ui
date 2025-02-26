// src/lib/utils/manifest/tags.ts
import axios, { AxiosError } from 'axios';
import type { ImageTag } from '$lib/types/tag';
import type { RepoImage } from '$lib/types/image';
import { Logger } from '$lib/services/logger';
import { getAuthHeaders, extractRepoName } from './helpers';
import { fetchDockerMetadata } from './metadata';

const logger = Logger.getInstance('TagUtils');

/**
 * Fetches tags for a Docker repository
 * @param registryUrl Base URL of the registry
 * @param repo Repository name
 * @returns Promise resolving to repository image data with tags
 */
export async function getDockerTags(registryUrl: string, repo: string): Promise<RepoImage> {
	logger.info(`Fetching tags for repository: ${repo}`);

	try {
		// Fetch tags list from registry
		const tagsUrl = `${registryUrl}/v2/${repo}/tags/list`;
		logger.debug(`Requesting tags from ${tagsUrl}`);

		const response = await axios.get(tagsUrl, {
			headers: getAuthHeaders()
		});

		const data = response.data;

		// Extract and validate repository name
		const name = data.name || extractRepoName(repo);
		if (!name) {
			logger.error(`Invalid repository name for ${repo}`);
			throw new Error('Invalid repository name');
		}

		// Process tags if available
		let tags: ImageTag[] = [];
		if (Array.isArray(data.tags) && data.tags.length > 0) {
			logger.info(`Found ${data.tags.length} tags for ${repo}`);

			// Fetch metadata for each tag in parallel
			tags = await Promise.all(
				data.tags.map(async (tag: string): Promise<ImageTag> => {
					try {
						const metadata = await fetchDockerMetadata(registryUrl, repo, tag);
						return { name: tag, metadata };
					} catch (error) {
						logger.error(`Error fetching metadata for ${repo}:${tag}:`, error instanceof Error ? error.message : String(error));
						return { name: tag, metadata: undefined };
					}
				})
			);
		} else {
			logger.info(`No tags found for repository ${repo}`);
		}

		// Return complete repository data
		return {
			name,
			fullName: repo,
			tags
		};
	} catch (error) {
		// Handle errors gracefully
		if (error instanceof AxiosError) {
			logger.error(`Network error fetching tags for ${repo}: ${error.message}`, {
				status: error.response?.status,
				data: error.response?.data
			});
		} else {
			logger.error(`Error fetching repo images for ${repo}:`, error instanceof Error ? error.message : String(error));
		}

		// Return fallback structure with empty tags
		const fallbackName = extractRepoName(repo, 'unknown');
		return {
			name: fallbackName,
			fullName: repo,
			tags: []
		};
	}
}

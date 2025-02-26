import type { RegistryRepos } from '$lib/types/api.type';
import { getDockerTags } from '$lib/utils/manifest/index.ts';
import axios, { AxiosError } from 'axios';
import { env } from '$env/dynamic/public';
import { Buffer } from 'buffer';
import { Logger } from '$lib/services/logger';
import type { Namespace, NamespaceMetadata } from '$lib/types/namespace.type';
import type { Tag } from '$lib/types/tag.type';
import type { Image } from '$lib/types/image.type';
import { formatSize } from '$lib/utils/manifest/helpers';

/**
 * Extracts the namespace from a full repository name
 * @param fullName Full repository name (e.g., 'namespace/image' or 'image')
 * @returns Namespace string or 'library' for root-level images
 */
function getNamespace(fullName: string): string {
	if (!fullName?.includes('/')) {
		return 'library'; // Use 'library' as default namespace like Docker Hub
	}
	return fullName.split('/')[0];
}

/**
 * Creates authorization headers for registry requests
 * @returns Authorization headers object
 */
function getAuthHeaders() {
	const auth = Buffer.from(`${env.PUBLIC_REGISTRY_USERNAME}:${env.PUBLIC_REGISTRY_PASSWORD}`).toString('base64');
	return {
		Authorization: `Basic ${auth}`,
		Accept: 'application/json'
	};
}

/**
 * Fetches all repositories from the registry and organizes them by namespace
 * @param url Registry URL
 * @returns Promise resolving to array of Namespaces
 */
export async function getRegistryReposAxios(url: string): Promise<Namespace[]> {
	const logger = Logger.getInstance('RegistryRepos');

	try {
		// Fix: Make sure we're using the base registry URL, not the catalog URL
		const baseRegistryUrl = url.endsWith('/v2/_catalog') ? url.replace('/v2/_catalog', '') : url;
		const catalogUrl = `${baseRegistryUrl}/v2/_catalog`;

		logger.info(`Fetching repositories from ${catalogUrl}`);

		const response = await axios.get(catalogUrl, {
			headers: getAuthHeaders()
		});

		const { repositories = [] } = response.data as { repositories: string[] };
		logger.info(`Found ${repositories.length} repositories`);

		// Group repositories by namespace
		const reposByNamespace: Record<string, string[]> = {};

		repositories.forEach((repo) => {
			const namespace = getNamespace(repo);

			if (!reposByNamespace[namespace]) {
				reposByNamespace[namespace] = [];
			}

			reposByNamespace[namespace].push(repo);
		});

		// Process each namespace
		const namespacePromises = Object.entries(reposByNamespace).map(async ([namespaceName, repos]) => {
			// Create a namespace object with the new type
			const namespaceObj: Namespace = {
				name: namespaceName,
				path: namespaceName,
				images: [],
				lastSynced: new Date(),
				metadata: {
					imageCount: 0,
					totalSize: '0 B',
					description: undefined
				}
			};

			// Fetch tags for each repository in parallel
			const imagePromises = repos.map(async (repo) => {
				try {
					// Get the image name from the repo path
					const imageName = repo.includes('/') ? repo.split('/')[1] : repo;

					// Pass the base registry URL, not the catalog URL
					const repoData = await getDockerTags(baseRegistryUrl, repo);

					// Convert RepoImage to the new Image type
					const image: Image = {
						name: imageName,
						fullName: repo,
						tags: repoData.tags.map((tag) => ({
							name: tag.name,
							metadata: tag.metadata
						})),
						metadata: {
							lastUpdated: getLastUpdatedFromTags(repoData.tags)
						}
					};

					namespaceObj.images.push(image);
				} catch (error) {
					logger.error(`Error fetching tags for ${repo}:`, error instanceof Error ? error.message : String(error));
				}
			});

			await Promise.all(imagePromises);

			// Update metadata after all images are fetched
			if (namespaceObj.images.length > 0) {
				namespaceObj.metadata = {
					imageCount: namespaceObj.images.length,
					totalSize: calculateTotalSize(namespaceObj.images),
					description: undefined
				};
			}

			return namespaceObj;
		});

		const namespaces = await Promise.all(namespacePromises);

		// Filter out empty namespaces
		return namespaces.filter((ns) => ns.images.length > 0);
	} catch (error) {
		// Improved error logging with type safety and details
		if (axios.isAxiosError(error)) {
			logger.error(`Failed to fetch repositories from ${url}:`, {
				status: error.response?.status,
				url: error.config?.url,
				message: error.message,
				data: error.response?.data
			});
		} else {
			logger.error(`Failed to fetch repositories from ${url}:`, error instanceof Error ? error.message : String(error));
		}
		return [];
	}
}

// Helper function to get the last updated date from tags
function getLastUpdatedFromTags(tags: Tag[]): Date | undefined {
	try {
		const dates = tags.filter((tag) => tag?.metadata?.created).map((tag) => new Date(tag.metadata!.created!));

		if (dates.length === 0) return undefined;

		return new Date(Math.max(...dates.map((date) => date.getTime())));
	} catch (error) {
		console.error('Error finding latest date:', error);
		return undefined;
	}
}

// Helper function to calculate total size
function calculateTotalSize(images: Image[]): string {
	try {
		let totalBytes = 0;

		images.forEach((image) => {
			image.tags.forEach((tag) => {
				if (tag.metadata?.totalSize) {
					totalBytes += Number(tag.metadata.totalSize);
				}
			});
		});

		return formatSize(totalBytes);
	} catch (error) {
		console.error('Error calculating total size:', error);
		return '0 B';
	}
}

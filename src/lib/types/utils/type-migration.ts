// src/lib/utils/model-migration.ts
import type { RegistryRepo } from '$lib/types/repo';
import type { RepoImage } from '$lib/types/image';
import type { ImageTag } from '$lib/types/tag';
import type { Namespace } from '$lib/types/namespace.type';
import type { Image } from '$lib/types/image.type';
import type { Tag, TagMetadata } from '$lib/types/tag.type';
import { formatSize } from '$lib/utils/manifest/helpers';
import { Logger } from '$lib/services/logger';

const logger = Logger.getInstance('TypeMigration');

/**
 * Convert legacy RegistryRepo models to new Namespace models
 */
export function convertToNewModel(repositories: RegistryRepo[] = []): Namespace[] {
	try {
		if (!Array.isArray(repositories)) {
			logger.warn('Invalid repositories data provided to convertToNewModel:', typeof repositories);
			return [];
		}

		return repositories
			.filter((repo) => repo !== null && typeof repo === 'object')
			.map((repo) => ({
				name: repo.name || 'unknown',
				path: repo.name || 'unknown',
				images: Array.isArray(repo.images) ? repo.images.filter((img) => img !== null && typeof img === 'object').map(convertImageToNewModel) : [],
				lastSynced: new Date(),
				metadata: {
					imageCount: Array.isArray(repo.images) ? repo.images.length : 0,
					totalSize: calculateTotalSize(Array.isArray(repo.images) ? repo.images : [])
				}
			}));
	} catch (error) {
		logger.error('Error converting to new model:', error);
		return [];
	}
}

/**
 * Convert legacy RepoImage to new Image model
 */
function convertImageToNewModel(image: RepoImage): Image {
	try {
		if (!image) {
			return {
				name: 'unknown',
				fullName: 'unknown',
				tags: [],
				metadata: { lastUpdated: undefined }
			};
		}

		return {
			name: image.name || 'unknown',
			fullName: image.fullName || image.name || 'unknown',
			tags: Array.isArray(image.tags) ? image.tags.filter((tag) => tag !== null && typeof tag === 'object').map(convertTagToNewModel) : [],
			metadata: {
				lastUpdated: getLastUpdatedFromTags(Array.isArray(image.tags) ? image.tags : [])
			}
		};
	} catch (error) {
		logger.error(`Error converting image to new model:`, error);
		return {
			name: 'error',
			fullName: 'error',
			tags: [],
			metadata: { lastUpdated: undefined }
		};
	}
}

/**
 * Convert legacy ImageTag to new Tag model
 */
function convertTagToNewModel(tag: ImageTag): Tag {
	try {
		if (!tag) {
			return { name: 'unknown' };
		}

		return {
			name: tag.name || 'unknown',
			metadata: tag.metadata as TagMetadata
		};
	} catch (error) {
		logger.error(`Error converting tag to new model:`, error);
		return { name: 'error' };
	}
}

/**
 * Calculate total size for images in a repository
 * Sums up the total size of all tags across all images
 */
function calculateTotalSize(images: RepoImage[]): string {
	try {
		// Extract all tag sizes as numbers
		const allSizes = images.flatMap((image) =>
			(Array.isArray(image?.tags) ? image.tags : [])
				.filter((tag) => tag?.metadata?.totalSize) // Only include tags with size information
				.map((tag) => {
					// Parse size string like "245.8 MB" to bytes
					const sizeMatch = tag?.metadata?.totalSize?.match(/^([\d.]+)\s*(\w+)$/);
					if (!sizeMatch) return 0;

					const [, sizeValue, unit] = sizeMatch;
					const value = parseFloat(sizeValue);

					// Convert to bytes for consistent calculation
					switch (unit?.toUpperCase()) {
						case 'B':
							return value;
						case 'KB':
							return value * 1024;
						case 'MB':
							return value * 1024 * 1024;
						case 'GB':
							return value * 1024 * 1024 * 1024;
						case 'TB':
							return value * 1024 * 1024 * 1024 * 1024;
						default:
							return 0;
					}
				})
		);

		// Sum all sizes
		const totalBytes = allSizes.reduce((sum, size) => sum + (size || 0), 0);

		// Format back to human-readable size
		return formatSize(totalBytes);
	} catch (error) {
		logger.error('Error calculating total size:', error);
		return 'Unknown';
	}
}

/**
 * Get last updated date from tags
 * Finds the most recent creation date among all tags
 */
function getLastUpdatedFromTags(tags: ImageTag[]): Date | undefined {
	try {
		// Extract dates from tags that have creation dates
		const dates = tags.filter((tag) => tag?.metadata?.created).map((tag) => new Date(tag.metadata!.created!));

		if (dates.length === 0) {
			return undefined;
		}

		// Find the most recent date
		return new Date(Math.max(...dates.map((date) => date.getTime())));
	} catch (error) {
		logger.error('Error finding latest date:', error);
		return undefined;
	}
}

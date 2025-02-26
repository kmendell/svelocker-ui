import { error } from '@sveltejs/kit';
import { RegistryCache } from '$lib/services/db';
import { Logger } from '$lib/services/logger';
import { convertToNewModel } from '$lib/types/utils/type-migration';
import type { PageServerLoad } from './$types';
import type { Image } from '$lib/types/image.type';

export const load: PageServerLoad = async ({ params, url }) => {
	const logger = Logger.getInstance('TagDetails');

	// For E2E tests
	if (process.env.PLAYWRIGHT === 'true' && url.searchParams.get('mock') === 'tagDetails') {
		logger.debug('Using mock tag details');
		return tagDetailsMock;
	}

	try {
		// Get legacy repositories
		const legacyRepos = RegistryCache.getRepositories();

		// Convert to new model
		const namespaces = convertToNewModel(legacyRepos);

		const { repo, image, tag } = params;

		// Find the namespace
		const namespace = namespaces.find((n) => n.name === repo);
		if (!namespace) {
			throw error(404, `Namespace ${repo} not found`);
		}

		// Find the image
		const imageObj = namespace.images.find((img) => img.name === image || img.fullName === `${repo}/${image}`);

		if (!imageObj) {
			throw error(404, `Image ${image} not found in ${repo}`);
		}

		// Find the tag
		const tagIndex = imageObj.tags.findIndex((t) => t.name === tag);

		if (tagIndex === -1) {
			throw error(404, `Tag ${tag} not found for ${repo}/${image}`);
		}

		const isLatest = tag === 'latest';

		// Return the data
		return {
			namespace: repo,
			imageName: image,
			imageFullName: imageObj.fullName,
			image: imageObj,
			tagIndex,
			isLatest
		};
	} catch (e) {
		// Handle unexpected errors
		if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
			// This is an error thrown by the error() helper
			throw e;
		} else {
			logger.error('Error loading tag details:', e);
			throw error(500, 'Failed to load image details');
		}
	}
};

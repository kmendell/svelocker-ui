import { Logger } from '$lib/services/logger';
import { env } from '$env/dynamic/public';
import { getRegistryReposAxios } from '$lib/utils/repos';
import { checkRegistryHealth } from '$lib/utils/health';
import { RegistryCache } from '$lib/services/db';
import { convertToNewModel } from '$lib/types/utils/type-migration';
import type { Namespace } from '$lib/types/namespace.type';
import type { LayoutServerLoad } from './$types';
import { basicMock, searchMock, paginationMock, errorMock, emptyMock, tagDetailsMock, unhealthyStatus } from '../../tests/e2e/mocks.ts';

export const load: LayoutServerLoad = async ({ url }) => {
	const logger = Logger.getInstance('LayoutServer');

	// Handle mock data for tests
	if (process.env.PLAYWRIGHT === 'true') {
		const mockType = url.searchParams.get('mock');
		logger.debug('Using mock type:', mockType);

		switch (mockType) {
			case 'basic':
				return basicMock;

			case 'search':
				return searchMock;

			case 'pagination':
				return paginationMock;

			case 'error':
				return errorMock;

			case 'empty':
				return emptyMock;

			case 'unhealthy':
				return {
					namespaces: [], // Empty array with new type
					error: 'Unable to connect to registry',
					healthStatus: unhealthyStatus
				};

			case 'tagDetails':
				return tagDetailsMock;

			default:
				// For default case, return a simple mock
				return basicMock;
		}
	}

	try {
		// Get registry URL from environment
		const registryUrl = env.PUBLIC_REGISTRY_URL;
		logger.info(`Using registry URL: ${registryUrl}`);

		// Check registry health
		const healthStatus = await checkRegistryHealth(registryUrl);

		if (!healthStatus.isHealthy) {
			logger.error(`Registry is unhealthy: ${healthStatus.message}`);
			return {
				namespaces: [],
				error: 'Unable to connect to registry',
				healthStatus
			};
		}

		// Fetch repos from registry or cache
		let namespaces;
		try {
			// Try to get from cache first
			// repos = RegistryCache.getRepositories() || [];
			namespaces = RegistryCache.getNamespaces();
			logger.debug(`Retrieved ${namespaces.length} namespaces from cache`);
		} catch (e) {
			// If cache doesn't exist or is invalid, fetch fresh data
			logger.warn('Cache retrieval failed, fetching fresh data:', e);
			namespaces = await getRegistryReposAxios(registryUrl);
			// Then sync it to DB
			// await RegistryCache.syncFromRegistry(repos || { repositories: [] }.repositories);
			await RegistryCache.syncFromRegistryWithNewModel(namespaces);
			logger.info(`Synced ${namespaces?.length || 0} repositories to cache`);
		}

		// Convert legacy repo model to new namespace model with safe defaults
		// const namespaces: Namespace[] = convertToNewModel(repos || []);
		// logger.debug(`Converted ${repos?.length || 0} repositories to ${namespaces.length} namespaces`);

		// Return the transformed data
		return {
			namespaces,
			error: null,
			healthStatus
		};
	} catch (error: unknown) {
		// Error handling
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`Error loading registry data: ${errorMessage}`);

		return {
			namespaces: [],
			error: `Failed to load registry data: ${errorMessage}`,
			healthStatus: {
				isHealthy: false,
				supportsV2: false,
				needsAuth: false,
				message: 'Error occurred while checking registry health'
			}
		};
	}
};

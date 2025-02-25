import axios from 'axios';
import { Logger } from '$lib/services/logger';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { Buffer } from 'buffer';

export async function deleteDockerManifestAxios(registryUrl: string, repo: string, contentDigest: string) {
	const logger = !browser ? Logger.getInstance('DeleteImageTag') : null;

	try {
		const auth = Buffer.from(`${env.PUBLIC_REGISTRY_USERNAME}:${env.PUBLIC_REGISTRY_PASSWORD}`).toString('base64');

		// Ensure clean digest
		const cleanDigest = contentDigest.replace(/"/g, '');
		const manifestUrl = `${registryUrl}/v2/${repo}/manifests/${cleanDigest}`;

		logger?.info(`Deleting manifest: ${manifestUrl}`);

		const response = await axios.delete(manifestUrl, {
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: ['application/vnd.docker.distribution.manifest.v2+json', 'application/vnd.oci.image.index.v1+json', 'application/vnd.oci.image.manifest.v1+json'].join(', ')
			}
		});

		if (response.status !== 202) {
			const error = `Failed to delete manifest: ${response.status}`;
			logger?.error(error);
			throw new Error(error);
		}

		try {
			// Ensure we have a valid sync URL
			const baseUrl = browser ? window.location.origin : env.PUBLIC_API_URL || window.location.origin;
			const syncUrl = `${baseUrl}/api/sync`;

			logger?.info(`Triggering sync at: ${syncUrl}`);

			const syncResponse = await axios.post(syncUrl, null, {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (syncResponse.status !== 200) {
				const error = `Sync failed with status: ${syncResponse.status}`;
				logger?.error(error);
				throw new Error(error);
			}

			logger?.info(`Successfully deleted and synced manifest for ${repo}`);
			return true;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				logger?.error(`Failed to sync after deletion: ${error.message}`, {
					status: error.response?.status,
					data: error.response?.data
				});
			} else {
				logger?.error('Failed to sync after deletion:', error);
			}
			throw error;
		}
	} catch (error) {
		if (axios.isAxiosError(error)) {
			logger?.error(`Error in delete operation: ${error.message}`, {
				status: error.response?.status,
				data: error.response?.data
			});
		} else {
			logger?.error('Error in delete operation:', error);
		}
		return false;
	}
}

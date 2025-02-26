// src/lib/utils/manifest/fetch.ts
import axios from 'axios';
import type { ImageMetadata } from '$lib/types/metadata';
import { Logger } from '$lib/services/logger';
import { getAuthString } from './helpers';
import { calculateSha256, filterAttestationManifests } from '$lib/utils/oci';

const logger = Logger.getInstance('ManifestFetch');

interface ManifestResponse {
	manifest: any;
	headers: Record<string, string>;
	isOCI: boolean;
}

/**
 * Fetches a manifest from the registry
 * @param registryUrl Base registry URL
 * @param repo Repository name
 * @param tag Tag name
 * @returns Manifest response object
 */
export async function fetchManifest(registryUrl: string, repo: string, tag: string): Promise<ManifestResponse> {
	const manifestUrl = `${registryUrl}/v2/${repo}/manifests/${tag}`;
	const auth = getAuthString();

	try {
		const response = await axios.get(manifestUrl, {
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.index.manifest.v1+json'
			}
		});

		const manifest = response.data;
		const contentDigest = response.headers['docker-content-digest'];
		const isOCI = manifest.mediaType === 'application/vnd.oci.image.index.v1+json';

		return {
			manifest,
			headers: response.headers as Record<string, string>,
			isOCI
		};
	} catch (error) {
		logger.error(`Error fetching manifest for ${repo}:${tag}:`, error);
		throw new Error(`Failed to fetch manifest: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Fetches image configuration from the registry
 * @param registryUrl Base registry URL
 * @param repo Repository name
 * @param configDigest Config digest
 * @returns Config object
 */
export async function fetchImageConfig(registryUrl: string, repo: string, configDigest: string): Promise<any> {
	const configUrl = `${registryUrl}/v2/${repo}/blobs/${configDigest}`;
	const auth = getAuthString();

	try {
		const response = await axios.get(configUrl, {
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: 'application/json'
			}
		});
		return response.data;
	} catch (error) {
		logger.error(`Error fetching config for ${repo}:${configDigest}:`, error);
		throw new Error(`Error fetching image config: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Processes an OCI manifest
 * @param registryUrl Base registry URL
 * @param repo Repository name
 * @param manifest Manifest object
 * @returns Processed OCI manifest data
 */
export async function processOciManifest(
	registryUrl: string,
	repo: string,
	manifest: any
): Promise<{
	configDigest: string;
	contentDigest: string;
	totalSize: number;
}> {
	const auth = getAuthString();

	// Find the first non-attestation manifest
	const platformManifest = manifest.manifests.find((m: any) => !m.annotations?.['vnd.docker.reference.type']);

	if (!platformManifest) {
		throw new Error('No valid platform manifest found');
	}

	// Fetch the platform-specific manifest
	const platformManifestResponse = await axios.get(`${registryUrl}/v2/${repo}/manifests/${platformManifest.digest}`, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: platformManifest.mediaType
		}
	});

	// Calculate total size for OCI manifest
	const manifestSize = platformManifest.size || 0;
	const layerSizes = platformManifestResponse.data.layers?.reduce((sum: number, layer: any) => sum + (layer.size || 0), 0) || 0;

	const totalSize = manifestSize + layerSizes;

	// Update configDigest from platform manifest
	const configDigest = platformManifestResponse.data.config?.digest;

	if (!configDigest) {
		throw new Error('Config digest not found in platform manifest');
	}

	// Calculate content digest for OCI manifest
	const formattedManifest = JSON.stringify(manifest);
	const filteredManifest = await filterAttestationManifests(formattedManifest);
	const contentDigest = await calculateSha256(filteredManifest);

	return {
		configDigest,
		contentDigest,
		totalSize
	};
}

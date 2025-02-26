// src/lib/utils/manifest/metadata.ts
import type { ImageMetadata } from '$lib/types/metadata';
import { Logger } from '$lib/services/logger';
import { formatSize } from './helpers';
import { fetchManifest, fetchImageConfig, processOciManifest } from './fetch';

const logger = Logger.getInstance('ManifestMetadata');

/**
 * Fetches Docker image metadata from a registry
 * @param registryUrl Base URL of the registry
 * @param repo Repository name
 * @param tag Tag to fetch metadata for
 * @returns Promise resolving to image metadata or undefined on error
 */
export async function fetchDockerMetadata(registryUrl: string, repo: string, tag: string): Promise<ImageMetadata | undefined> {
	try {
		// Fetch manifest
		const { manifest, headers, isOCI } = await fetchManifest(registryUrl, repo, tag);

		// Store the deletion digest in indexDigest for both types
		const indexDigest = headers['docker-content-digest']?.replace(/"/g, '');

		// Process manifest data
		let configDigest;
		let contentDigest;
		let totalSize = 0;

		// Process manifest based on type
		if (isOCI) {
			// Process OCI manifest
			const ociData = await processOciManifest(registryUrl, repo, manifest);
			configDigest = ociData.configDigest;
			contentDigest = ociData.contentDigest;
			totalSize = ociData.totalSize;
		} else {
			// Handle regular Docker manifest
			configDigest = manifest.config?.digest;
			contentDigest = headers['docker-content-digest']?.replace(/"/g, '') || manifest.config?.digest;
			totalSize = manifest.layers?.reduce((sum: number, layer: any) => sum + (layer.size || 0), 0) || 0;
		}

		if (!configDigest) {
			throw new Error('Config digest not found in manifest.');
		}

		// Fetch the image config
		const config = await fetchImageConfig(registryUrl, repo, configDigest);

		// Extract metadata from config
		const author = config.config?.Labels?.['org.opencontainers.image.authors'] || config.config?.Labels?.['org.opencontainers.image.vendor'] || 'Unknown';

		const cmd = config.config?.Cmd ? config.config.Cmd.join(' ') : 'Unknown Command';
		const entrypoint = config.config?.Entrypoint ? config.config.Entrypoint.join(' ') : 'Unknown Entrypoint';
		const description = config.config?.Labels?.['org.opencontainers.image.description'] || 'No description found';
		const exposedPorts = config.config?.ExposedPorts ? Object.keys(config.config.ExposedPorts) : [];
		const dockerFile = config.history?.map((entry: any) => entry.created_by).join('\n') || 'No Dockerfile found';
		const workDir = config.config?.WorkingDir || '/';

		// Return full metadata object
		return {
			created: config.created,
			os: config.os,
			architecture: config.architecture,
			author,
			dockerFile,
			configDigest,
			exposedPorts,
			totalSize: formatSize(totalSize),
			workDir,
			command: cmd,
			description,
			contentDigest,
			entrypoint,
			indexDigest,
			isOCI
		};
	} catch (error) {
		logger.error(`Error fetching metadata for ${repo}:${tag}:`, error);
		return undefined; // Return undefined in case of an error
	}
}

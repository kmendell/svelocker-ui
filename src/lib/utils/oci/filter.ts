// src/lib/utils/oci/filter.ts
import { Logger } from '$lib/services/logger';

const logger = Logger.getInstance('OCIManifest');

/**
 * Filters out attestation manifests from OCI manifest
 * @param manifestJson JSON string of manifest
 * @returns Filtered manifest as a string
 */
export async function filterAttestationManifests(manifestJson: string): Promise<string> {
	try {
		const manifest = JSON.parse(manifestJson);

		if (manifest.manifests) {
			// Filter out attestation manifests
			manifest.manifests = manifest.manifests.filter((m: any) => !m.annotations?.['vnd.docker.reference.type']);

			// Ensure deterministic ordering
			manifest.manifests.sort((a: any, b: any) => a.digest.localeCompare(b.digest));
		}

		// Ensure deterministic JSON stringification
		return JSON.stringify(manifest, null, 2);
	} catch (error) {
		logger.error('Error filtering attestation manifests:', error);
		throw error;
	}
}

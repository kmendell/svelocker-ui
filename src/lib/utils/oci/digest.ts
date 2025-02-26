// src/lib/utils/oci/digest.ts
import { createHash } from 'crypto';
import { Logger } from '$lib/services/logger';

const logger = Logger.getInstance('OCIManifest');

/**
 * Calculates SHA256 hash for content
 * @param content Content to hash
 * @returns SHA256 hash prefixed with "sha256:"
 */
export async function calculateSha256(content: string): Promise<string> {
	try {
		const hash = createHash('sha256');
		// Remove all whitespace and newlines for consistent hashing
		const normalized = content.replace(/\s/g, '');
		hash.update(normalized);
		return `sha256:${hash.digest('hex')}`;
	} catch (error) {
		logger.error('Error calculating SHA256:', error);
		throw error;
	}
}

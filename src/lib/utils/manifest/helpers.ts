// src/lib/utils/manifest/helpers.ts
import { Buffer } from 'buffer';
import { env } from '$env/dynamic/public';

/**
 * Creates authentication headers for registry requests
 * @returns Authorization headers object
 */
export function getAuthHeaders(): Record<string, string> {
	const auth = Buffer.from(`${env.PUBLIC_REGISTRY_USERNAME}:${env.PUBLIC_REGISTRY_PASSWORD}`).toString('base64');
	return {
		Authorization: `Basic ${auth}`,
		Accept: 'application/json'
	};
}

/**
 * Creates a base64 encoded auth string for registry requests
 * @returns Base64 encoded auth string
 */
export function getAuthString(): string {
	return Buffer.from(`${env.PUBLIC_REGISTRY_USERNAME}:${env.PUBLIC_REGISTRY_PASSWORD}`).toString('base64');
}

/**
 * Extract repository name from full path
 * @param fullRepoPath Full repository path
 * @param defaultName Default name to return if extraction fails
 * @returns Repository name
 */
export function extractRepoName(fullRepoPath: string, defaultName: string = ''): string {
	return fullRepoPath.split('/').pop() || defaultName;
}

/**
 * Formats byte size to human-readable format
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g., "1.50 MB")
 */
export function formatSize(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(2)} ${units[i]}`;
}

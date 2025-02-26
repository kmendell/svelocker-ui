// src/lib/models/registry.ts
export type Registry = {
	/**
	 * Base URL of the registry
	 */
	url: string;

	/**
	 * User-friendly name of the registry
	 */
	name: string;

	/**
	 * Health information about the registry
	 */
	health: RegistryHealth;

	/**
	 * Registry API version information
	 */
	api: {
		version: string;
		supportsV2: boolean;
	};
};

export type RegistryHealth = {
	/**
	 * Whether the registry is healthy and accessible
	 */
	isHealthy: boolean;

	/**
	 * Whether authentication is required for this registry
	 */
	needsAuth: boolean;

	/**
	 * Status message
	 */
	message: string;

	/**
	 * Last health check time
	 */
	lastChecked: Date;
};

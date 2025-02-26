import cron from 'node-cron';
import { getRegistryReposAxios } from '$lib/utils/repos';
import { RegistryCache } from './db';
import { env } from '$env/dynamic/public';
import { Logger } from '$lib/services/logger';
import { dev } from '$app/environment';
import { convertToNewModel } from '$lib/types/utils/type-migration';
import type { Namespace } from '$lib/types/namespace.type';

export class RegistrySyncService {
	private static instance: RegistrySyncService;
	private cronJob: cron.ScheduledTask | null = null;
	private logger: Logger;
	private isSyncing: boolean = false;
	private isStarted: boolean = false;

	private constructor() {
		this.logger = Logger.getInstance('RegistrySync');
		// Run every 5 minutes by default
		this.cronJob = cron.schedule('*/5 * * * *', async () => {
			try {
				this.logger.info('Starting registry sync...');
				await this.performSync();
				this.logger.info('Registry sync completed successfully');
			} catch (error) {
				this.logger.error('Registry sync failed:', error);
			}
		});
	}

	private async performSync(): Promise<void> {
		if (this.isSyncing) {
			this.logger.warn('Sync already in progress, skipping...');
			return;
		}

		this.isSyncing = true;
		try {
			// Fetch data using the existing API
			const registryData = await getRegistryReposAxios(env.PUBLIC_REGISTRY_URL + '/v2/_catalog');

			// For backward compatibility, still sync with the old method
			// This can be removed once full migration is complete
			await RegistryCache.syncFromRegistry(registryData.repositories);

			// Convert to new model structure
			this.logger.debug('Converting repositories to namespace model');
			const namespaces: Namespace[] = convertToNewModel(registryData.repositories);

			// Sync using the new model
			this.logger.debug(`Syncing ${namespaces.length} namespaces with new model`);
			await RegistryCache.syncFromRegistryWithNewModel(namespaces);

			this.logger.info(`Registry sync completed with ${namespaces.length} namespaces`);
		} catch (error) {
			this.logger.error('Registry sync failed', error);
		} finally {
			this.isSyncing = false;
		}
	}

	public static getInstance(): RegistrySyncService {
		if (!RegistrySyncService.instance) {
			RegistrySyncService.instance = new RegistrySyncService();
		}
		return RegistrySyncService.instance;
	}

	public start(): void {
		if (this.isStarted) {
			this.logger.warn('Service already started, skipping...');
			return;
		}
		if (this.cronJob) {
			this.cronJob.start();
			this.isStarted = true;
			this.logger.info('Registry sync service started with schedule: */5 * * * *');
		}
	}

	public stop(): void {
		if (this.cronJob) {
			this.cronJob.stop();
			this.cronJob = null;
			this.isStarted = false;
			this.logger.info('Registry sync service stopped');
		}
	}

	public async syncNow(): Promise<void> {
		if (!this.isSyncing) {
			await this.performSync();
		}
	}
}

import cron from 'node-cron';
import { getRegistryReposAxios } from '$lib/utils/repos';
import { RegistryCache } from './db';
import { env } from '$env/dynamic/public';
import { Logger } from '$lib/services/logger';
import { dev } from '$app/environment';

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
				const registryData = await getRegistryReposAxios(env.PUBLIC_REGISTRY_URL + '/v2/_catalog');
				await RegistryCache.syncFromRegistry(registryData.repositories);
				this.logger.info('Registry sync completed successfully');
			} catch (error) {
				console.error('Registry sync failed:', error);
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
			const registryData = await getRegistryReposAxios(env.PUBLIC_REGISTRY_URL + '/v2/_catalog');
			await RegistryCache.syncFromRegistry(registryData.repositories);
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

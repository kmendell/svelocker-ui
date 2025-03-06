import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DockerService } from '$lib/utils/garbagecollect';
import { Logger } from '$lib/services/logger';

const logger = Logger.getInstance('GarbageCollect');

export const POST: RequestHandler = async () => {
	try {
		const dockerService = new DockerService();
		const success = await dockerService.runGarbageCollection();

		if (!success) {
			logger.error('Garbage collection failed');
			return json({
				success: false,
				error: 'Garbage collection failed. Check server logs for details.'
			});
		}

		logger.info('Garbage collection completed successfully');
		return json({ success: true });
	} catch (error) {
		logger.error('Error during garbage collection', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred'
		});
	}
};

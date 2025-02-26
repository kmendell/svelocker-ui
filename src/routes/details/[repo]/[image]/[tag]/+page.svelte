<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { AppWindowMac, Trash2, CalendarCog, CircuitBoard, UserPen, EthernetPort, Slash, Scaling, Terminal, FolderCode } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { copyTextToClipboard } from '$lib/utils/clipboard.ts';
	import { convertTimeString } from '$lib/utils/time.ts';
	import { Badge } from '$lib/components/ui/badge';
	import MetadataItem from '$lib/components/docker-metadata/MetadataItem.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.ts';
	import type { PageData } from './$types';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Copy } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { deleteDockerManifestAxios } from '$lib/utils/delete.ts';
	import { env } from '$env/dynamic/public';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	export let data: PageData;

	async function copyDockerfile() {
		if (!currentTag.metadata?.dockerFile) {
			toast.error('No Dockerfile available');
			return;
		}

		copyTextToClipboard(currentTag.metadata.dockerFile).then((success) => {
			if (success) {
				toast.success('Dockerfile Copied successfully');
			} else {
				toast.error('Failed to copy Dockerfile...');
			}
		});
	}

	// $: currentTag = data.tag.tags[data.tagIndex];
	$: currentTag = data?.image?.tags?.[data?.tagIndex];

	async function deleteTagBackend(name: string, digest: string) {
		if (!digest) {
			toast.error('Error Deleting Docker Tag', {
				description: 'No digest found for this tag'
			});
			return;
		}

		try {
			const response = await fetch('/api/manifest/delete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					registryUrl: env.PUBLIC_REGISTRY_URL,
					repo: name,
					digest: digest,
					manifestType: currentTag.metadata?.isOCI ? 'application/vnd.oci.image.index.v1+json' : 'application/vnd.docker.distribution.manifest.v2+json'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to delete tag');
			}

			const result = await response.json();

			if (result.success) {
				toast.success('Docker Tag Deleted Successfully', {
					description: 'Run `registry garbage-collect /etc/docker/registry/config.yml` to cleanup. Refreshing...'
				});
				setTimeout(() => (window.location.href = '/'), 3000);
			} else {
				toast.error('Error Deleting Docker Tag', {
					description: result.error || 'Check your Registry configuration.'
				});
			}
		} catch (error) {
			toast.error('Error Deleting Docker Tag', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred'
			});
		}
	}
</script>

<div class="mx-auto w-full max-w-[95%] p-8">
	<div class="space-y-8">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground">
						<span>Home</span>
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator>
					<Slash class="h-4 w-4" />
				</Breadcrumb.Separator>
				{#if data.repo !== 'library'}
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground">
							{data.namespace}
						</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator>
						<Slash class="h-4 w-4" />
					</Breadcrumb.Separator>
				{/if}
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground">{data.imageName}</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator>
					<Slash class="h-4 w-4" />
				</Breadcrumb.Separator>
				<Breadcrumb.Item>
					<Breadcrumb.Link class="text-foreground">{currentTag.name}</Breadcrumb.Link>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<div class="grid grid-cols-2 gap-8">
			<!-- Left side: Metadata -->
			<div class="space-y-8">
				<div class="space-y-4">
					<div class="flex justify-between items-center">
						<h1 class="text-3xl font-semibold tracking-tight">
							{data.imageFullName}:{currentTag.name}
							{#if data.isLatest}
								<span class="ml-3 inline-flex items-center">
									<Badge class="h-8 min-w-24 px-4 text-sm font-normal rounded-full border-green-400/50 text-green-400 inline-flex items-center justify-center" variant="outline">Latest Version</Badge>
								</span>
							{/if}
						</h1>
						<AlertDialog.Root>
							<AlertDialog.Trigger class="{buttonVariants({ variant: 'destructive', size: 'sm' })} gap-2"><Trash2 class="h-4 w-4" /> Delete Tag</AlertDialog.Trigger>
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title class="font-light text-md">Are you sure you want to delete the tag <span class="font-bold">{data.imageFullName}:{currentTag.name}</span>?</AlertDialog.Title>
									<AlertDialog.Description>This action cannot be undone. <span class="font-bold">All tags with the same config digest will be deleted.</span></AlertDialog.Description>
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
									<AlertDialog.Action
										onclick={() => {
											const digest = currentTag.metadata?.indexDigest;
											console.log('Selected digest:', digest);

											if (!digest) {
												toast.error('Error Deleting Docker Tag', {
													description: 'No digest found for this tag'
												});
												return;
											}

											// Strip 'library/' prefix if present
											const imageName = data.imageFullName.startsWith('library/') ? data.imageFullName.replace('library/', '') : data.imageFullName;

											deleteTagBackend(imageName, digest);
										}}
										class={buttonVariants({ variant: 'destructive' })}
									>
										Delete
									</AlertDialog.Action>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Root>
					</div>
					{#if currentTag.metadata}
						<div class="space-y-2">
							<p class="text-lg text-muted-foreground">{currentTag.metadata.description}</p>
							<p class="text-sm text-muted-foreground font-mono">{currentTag.metadata?.indexDigest || ''}</p>
						</div>
					{/if}
				</div>

				<Separator />

				{#if currentTag?.metadata}
					<div class="grid gap-6">
						<div class="grid grid-cols-2 gap-6">
							<MetadataItem label="OS" icon={AppWindowMac} value={currentTag.metadata.os} />
							<MetadataItem label="Arch" icon={CircuitBoard} value={currentTag.metadata.architecture} />
							<MetadataItem label="Created" icon={CalendarCog} value={currentTag.metadata.created ? (convertTimeString(currentTag.metadata.created) ?? '') : ''} />
							<MetadataItem label="Author" icon={UserPen} value={currentTag.metadata.author ?? ''} />
							<MetadataItem label="Exposed Ports" icon={EthernetPort} value={Array.isArray(currentTag.metadata.exposedPorts) ? currentTag.metadata.exposedPorts.join(', ') : currentTag.metadata.exposedPorts} />
							<MetadataItem label="Container Size" icon={Scaling} value={currentTag.metadata.totalSize} />
							<MetadataItem label="Working Directory" icon={FolderCode} value={currentTag.metadata.workDir} />
							<MetadataItem label="Command" icon={Terminal} value={currentTag.metadata.command} />
							<MetadataItem label="Entrypoint" icon={Terminal} value={currentTag.metadata.entrypoint} />
						</div>
					</div>
				{/if}
			</div>

			<!-- Right side: Dockerfile -->
			<ScrollArea class="border rounded-lg h-[calc(100vh-12rem)]">
				<div class="border-b bg-muted sticky top-0 z-10 flex justify-between items-center p-4">
					<div>
						<h2 class="text-lg font-semibold">Dockerfile</h2>
						<p class="text-sm text-muted-foreground">Viewing Dockerfile for {data.imageFullName}:{currentTag.name}</p>
					</div>
					<Button variant="outline" size="sm" class="gap-2 dockerButton" onclick={copyDockerfile}>
						<Copy class="h-4 w-4" />
						Copy
					</Button>
				</div>
				<div class="relative">
					<pre class="flex text-sm font-mono leading-relaxed">
						<!-- Line numbers -->
						<div class="py-1 pl-2 pr-4 text-gray-400 select-none border-r border-gray-700 bg-[#1e1e1e] w-[4rem]">
							{#if currentTag.metadata?.dockerFile}
								{#each currentTag.metadata.dockerFile.split('\n') as _, i}
									<div class="text-right max-h-[1px] flex items-center justify-end px-2">{i + 1}</div>
								{/each}
							{/if}
						</div>
						<!-- Code content -->
						<div class="py-1 px-6 bg-[#1e1e1e] w-full overflow-x-auto">
							{#if currentTag.metadata?.dockerFile}
								{#each currentTag.metadata.dockerFile.split('\n') as line}
									<div class="max-h-[1px] flex items-center">
										<span>{line}</span>
									</div>
								{/each}
							{/if}
						</div>
					</pre>
				</div>
			</ScrollArea>
		</div>
	</div>
</div>

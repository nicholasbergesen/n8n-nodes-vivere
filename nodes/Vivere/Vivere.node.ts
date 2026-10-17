import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeListSearchResult,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type JsonObject,
} from 'n8n-workflow';

import {
	BASE_URL,
	countItems,
	errorFromItem,
	pingUrlFor,
	sendPing,
	vivereApiRequest,
} from './GenericFunctions';
import { monitorFields, monitorOperations } from './MonitorDescription';
import { pingFields, pingOperations } from './PingDescription';

// This node is programmatic rather than declarative because a ping is sent once
// per execution, not once per item, and the items pass through unchanged so the
// node can sit anywhere in a workflow. Declarative routing makes one request
// per input item and replaces the items with the response.

interface MonitorSummary {
	id?: string;
	name: string;
	kind: string;
	ping_url?: string;
	page?: { title?: string };
}

const USAGE_PARAMS: Array<[string, string]> = [
	['model', 'model'],
	['inputTokens', 'in'],
	['outputTokens', 'out'],
	['cacheRead', 'cache_read'],
	['cacheWrite', 'cache_write'],
	['cost', 'cost'],
];

export class Vivere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vivere',
		name: 'vivere',
		icon: { light: 'file:vivere.svg', dark: 'file:vivere.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle:
			'={{ $parameter["resource"] === "monitor" ? "Create monitor" : "Ping " + $parameter["operation"] }}',
		description:
			'Tell Vivere when a workflow runs, finishes or fails, so a workflow that stops running alerts you',
		defaults: {
			name: 'Vivere',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'vivereApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Ping',
						value: 'ping',
					},
					{
						name: 'Monitor',
						value: 'monitor',
					},
				],
				default: 'ping',
			},
			...pingOperations,
			...pingFields,
			...monitorOperations,
			...monitorFields,
		],
	};

	methods = {
		listSearch: {
			async searchMonitors(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const res = await vivereApiRequest.call(this, 'GET', '/monitors');
				const monitors = (res.monitors ?? []) as MonitorSummary[];
				const needle = (filter ?? '').toLowerCase();
				const results = monitors
					.filter((m) => m.kind === 'heartbeat' && m.id && m.ping_url)
					.filter((m) => !needle || m.name.toLowerCase().includes(needle))
					.map((m) => ({
						name: m.page?.title ? `${m.name} (${m.page.title})` : m.name,
						value: m.id as string,
						url: `${BASE_URL}/app/monitors/${m.id}`,
					}));
				return { results };
			},
		},
		loadOptions: {
			async getPages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await vivereApiRequest.call(this, 'GET', '/pages');
				const pages = (res.pages ?? []) as Array<{ id: number; title: string; access: string }>;
				return pages
					.filter((p) => p.access === 'owner' || p.access === 'editor')
					.map((p) => ({ name: p.title, value: p.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'ping') {
			try {
				await ping.call(this, operation, items);
			} catch (error) {
				if (this.continueOnFail()) {
					return [items.map((item) => ({ ...item, json: { ...item.json, error: error.message } }))];
				}
				throw wrapError.call(this, error);
			}
			return [items];
		}

		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'monitor' && operation === 'create') {
					const monitor = await createMonitor.call(this, i);
					returnData.push({ json: monitor, pairedItem: { item: i } });
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw wrapError.call(this, error, i);
			}
		}
		return [returnData];
	}
}

/** Gives back an error from a request helper as it is, and wraps anything else. */
function wrapError(this: IExecuteFunctions, error: Error, itemIndex?: number) {
	if (error instanceof NodeApiError)
		return new NodeApiError(this.getNode(), error as unknown as JsonObject);
	return new NodeOperationError(this.getNode(), error, { itemIndex });
}

/** Sends the one ping for this execution, using the first item's parameters. */
async function ping(
	this: IExecuteFunctions,
	operation: string,
	items: INodeExecutionData[],
): Promise<void> {
	const url = pingUrlFor.call(this, 0);

	if (operation === 'start') {
		const options = this.getNodeParameter('startOptions', 0, {}) as IDataObject;
		await sendPing.call(this, `${url}/start`, {}, String(options.log ?? ''));
		return;
	}

	if (operation === 'fail') {
		const message = (this.getNodeParameter('message', 0, '') as string).trim();
		await sendPing.call(this, `${url}/fail`, {}, message || errorFromItem(items[0]));
		return;
	}

	if (operation !== 'success') {
		throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for pings`);
	}

	const qs: IDataObject = {};
	const usage = this.getNodeParameter('usage', 0, {}) as IDataObject;
	for (const [field, param] of USAGE_PARAMS) {
		const value = usage[field];
		if (value !== undefined && value !== null && value !== '') qs[param] = String(value);
	}
	const options = this.getNodeParameter('successOptions', 0, {}) as IDataObject;
	let log = String(options.log ?? '');

	const mode = this.getNodeParameter('itemCount', 0, 'received') as string;
	if (mode !== 'none') {
		const count =
			mode === 'custom'
				? Math.max(0, Math.floor(this.getNodeParameter('customCount', 0, 0) as number))
				: countItems(items);
		qs.items = String(count);
		const failIfEmpty = this.getNodeParameter('failIfEmpty', 0, false) as boolean;
		if (failIfEmpty && count === 0) {
			const note = 'The run finished with 0 items, and Fail If 0 Items is on.';
			log = log ? `${note}\n${log}` : note;
			await sendPing.call(this, `${url}/fail`, qs, log);
			return;
		}
	}
	await sendPing.call(this, url, qs, log);
}

async function createMonitor(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const body: IDataObject = {
		kind: 'heartbeat',
		name: this.getNodeParameter('name', i) as string,
		grace: this.getNodeParameter('grace', i, '') as string,
	};
	if (this.getNodeParameter('scheduleType', i) === 'cron') {
		body.cron = this.getNodeParameter('cron', i) as string;
		body.timezone = this.getNodeParameter('timezone', i, 'UTC') as string;
	} else {
		body.period = this.getNodeParameter('period', i) as string;
	}
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	if (extra.page) body.page = Number(extra.page);
	if (extra.tags) body.tags = extra.tags;
	if (extra.description) body.description = extra.description;
	if (extra.public !== undefined) body.public = extra.public;
	return await vivereApiRequest.call(this, 'POST', '/monitors', body);
}

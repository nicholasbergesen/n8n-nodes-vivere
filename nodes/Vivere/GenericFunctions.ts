import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameterResourceLocator,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export const BASE_URL = 'https://vivere.dev';

const ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const PING_URL_RE =
	/^(https?:\/\/[^/]+)\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Calls the Vivere JSON API with the node's API key. */
export async function vivereApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}/api/v1${path}`,
		headers: { Accept: 'application/json' },
		json: true,
	};
	if (body) options.body = body;
	if (qs) options.qs = qs;
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'vivereApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Turns the Monitor parameter into the monitor's ping URL. A ping URL is used
 * as given, minus any suffix such as /start, so a monitor on another Vivere
 * host keeps working; a monitor picked from the list or by ID pings vivere.dev.
 */
export function pingUrlFor(this: IExecuteFunctions, itemIndex: number): string {
	const rl = this.getNodeParameter('monitor', itemIndex, undefined, {
		extractValue: false,
	}) as INodeParameterResourceLocator;
	const value = String(rl.value ?? '').trim();
	if (rl.mode === 'url') {
		const m = PING_URL_RE.exec(value);
		if (!m) {
			throw new NodeOperationError(this.getNode(), `"${value}" is not a Vivere ping URL`, {
				itemIndex,
				description: 'A ping URL looks like https://vivere.dev/p/ followed by the monitor ID.',
			});
		}
		return `${m[1]}/p/${m[2].toLowerCase()}`;
	}
	const id = ID_RE.exec(value);
	if (!id) {
		throw new NodeOperationError(this.getNode(), 'Choose a monitor to ping', { itemIndex });
	}
	return `${BASE_URL}/p/${id[0].toLowerCase()}`;
}

/** Sends one ping. Pings are authenticated by the URL, so no key is sent. */
export async function sendPing(
	this: IExecuteFunctions,
	url: string,
	qs: IDataObject,
	log: string,
): Promise<void> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url,
		qs,
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'User-Agent': 'n8n-nodes-vivere' },
		body: log,
		json: false,
		timeout: 10000,
	};
	try {
		await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Vivere did not accept the ping to ${url}`,
		});
	}
}

/**
 * Counts the items a run handled. n8n runs a node with one empty item when
 * the node before it found nothing and has Always Output Data on, and that is
 * a run with nothing in it, not a run with one item.
 */
export function countItems(items: INodeExecutionData[]): number {
	const real = items.filter(
		(item) => Object.keys(item.json ?? {}).length > 0 || Object.keys(item.binary ?? {}).length > 0,
	);
	return real.length;
}

/**
 * Finds the error in an item from an Error Trigger (execution.error) or from a
 * node's error output (error), as text for the failed run's log.
 */
export function errorFromItem(item: INodeExecutionData | undefined): string {
	if (!item) return '';
	const json = item.json ?? {};
	const execution = json.execution as IDataObject | undefined;
	if (execution && typeof execution === 'object') {
		const err = execution.error as IDataObject | undefined;
		const lines: string[] = [];
		if (err?.message) lines.push(String(err.message));
		if (execution.lastNodeExecuted) lines.push(`Node: ${String(execution.lastNodeExecuted)}`);
		const workflow = json.workflow as IDataObject | undefined;
		if (workflow?.name) lines.push(`Workflow: ${String(workflow.name)}`);
		if (execution.url) lines.push(`Execution: ${String(execution.url)}`);
		if (lines.length > 0) return lines.join('\n');
	}
	const err = json.error;
	if (typeof err === 'string') return err;
	if (err && typeof err === 'object' && (err as IDataObject).message) {
		return String((err as IDataObject).message);
	}
	return '';
}

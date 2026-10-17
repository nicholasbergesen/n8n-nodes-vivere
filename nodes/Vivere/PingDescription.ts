import type { INodeProperties } from 'n8n-workflow';

const showFor = (operation: string[]) => ({ show: { resource: ['ping'], operation } });

export const pingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['ping'] } },
		options: [
			{
				name: 'Fail',
				value: 'fail',
				description: 'Report that the run failed, so the monitor goes down at once',
				action: 'Report a failed run',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Report that a run started, so Vivere records how long it takes',
				action: 'Report a run start',
			},
			{
				name: 'Success',
				value: 'success',
				description: 'Report that the run finished, with what it handled and cost',
				action: 'Report a successful run',
			},
		],
		default: 'success',
	},
];

export const pingFields: INodeProperties[] = [
	{
		displayName: 'Monitor',
		name: 'monitor',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['ping'] } },
		description:
			'The heartbeat monitor to ping. The node sends one ping per execution, however many items it receives.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a monitor...',
				typeOptions: {
					searchListMethod: 'searchMonitors',
					searchable: true,
				},
			},
			{
				displayName: 'By Ping URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://vivere.dev/p/0f6c3a52-8d1e-4b7a-9c2f-5e4d3b2a1c0f',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'https?://[^/]+/p/[0-9a-fA-F-]{36}(/.*)?',
							errorMessage: 'Not a Vivere ping URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '0f6c3a52-8d1e-4b7a-9c2f-5e4d3b2a1c0f',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
							errorMessage: 'Not a Vivere monitor ID',
						},
					},
				],
			},
		],
	},

	// Success
	{
		displayName: 'Item Count',
		name: 'itemCount',
		type: 'options',
		displayOptions: showFor(['success']),
		options: [
			{
				name: 'Items Received',
				value: 'received',
				description: 'The number of items that reached this node',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'A number you set, usually with an expression',
			},
			{
				name: "Don't Report",
				value: 'none',
			},
		],
		default: 'received',
		description:
			'How many items the run handled, shown on the run in Vivere. A lone empty item, such as the one a node with Always Output Data sends when it found nothing, counts as 0.',
	},
	{
		displayName: 'Count',
		name: 'customCount',
		type: 'number',
		typeOptions: { minValue: 0, numberPrecision: 0 },
		displayOptions: { show: { resource: ['ping'], operation: ['success'], itemCount: ['custom'] } },
		default: 0,
		description: 'The number of items the run handled',
	},
	{
		displayName: 'Fail If 0 Items',
		name: 'failIfEmpty',
		type: 'boolean',
		displayOptions: {
			show: { resource: ['ping'], operation: ['success'], itemCount: ['received', 'custom'] },
		},
		default: false,
		description:
			'Whether to report the run as failed when it handled no items, so a run that finished without doing anything still alerts',
	},
	{
		displayName: 'Usage',
		name: 'usage',
		type: 'collection',
		placeholder: 'Add Usage Field',
		displayOptions: showFor(['success']),
		default: {},
		description:
			'What the run cost, for AI and other metered steps. Vivere shows it per run and can alert on cost.',
		options: [
			{
				displayName: 'Cache Read Tokens',
				name: 'cacheRead',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 0 },
				default: 0,
			},
			{
				displayName: 'Cache Write Tokens',
				name: 'cacheWrite',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 0 },
				default: 0,
			},
			{
				displayName: 'Cost (USD)',
				name: 'cost',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 6 },
				default: 0,
				description: 'What the run cost in US dollars',
			},
			{
				displayName: 'Input Tokens',
				name: 'inputTokens',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 0 },
				default: 0,
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				placeholder: 'claude-sonnet-5-5',
				description: 'The model the run used',
			},
			{
				displayName: 'Output Tokens',
				name: 'outputTokens',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 0 },
				default: 0,
			},
		],
	},
	{
		displayName: 'Options',
		name: 'successOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: showFor(['success']),
		default: {},
		options: [
			{
				displayName: 'Run Log',
				name: 'log',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Text to keep with the run in Vivere, such as a summary of what it did',
			},
		],
	},

	// Fail
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 3 },
		displayOptions: showFor(['fail']),
		default: '',
		description:
			'Why the run failed, kept with the run in Vivere. Leave empty to send the error from an Error Trigger or from the error output of the node before this one.',
	},

	// Start
	{
		displayName: 'Options',
		name: 'startOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: showFor(['start']),
		default: {},
		options: [
			{
				displayName: 'Run Log',
				name: 'log',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Text to keep with the start of the run in Vivere',
			},
		],
	},
];

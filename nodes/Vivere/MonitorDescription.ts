import type { INodeProperties } from 'n8n-workflow';

const showFor = (operation: string[]) => ({ show: { resource: ['monitor'], operation } });

export const monitorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['monitor'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a heartbeat monitor and get its ping URL',
				action: 'Create a monitor',
			},
		],
		default: 'create',
	},
];

export const monitorFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: showFor(['create']),
		default: '',
		placeholder: 'Nightly invoice sync',
	},
	{
		displayName: 'Schedule',
		name: 'scheduleType',
		type: 'options',
		displayOptions: showFor(['create']),
		options: [
			{
				name: 'Period',
				value: 'period',
				description: 'The job runs at a fixed interval, such as every hour',
			},
			{
				name: 'Cron',
				value: 'cron',
				description: 'The job runs on a cron expression, such as 0 6 * * 1-5',
			},
		],
		default: 'period',
	},
	{
		displayName: 'Period',
		name: 'period',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['monitor'], operation: ['create'], scheduleType: ['period'] },
		},
		default: '1h',
		placeholder: '1h',
		description: 'How often the job runs, such as 15m, 1h or 1d. Match the Schedule Trigger.',
	},
	{
		displayName: 'Cron Expression',
		name: 'cron',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['monitor'], operation: ['create'], scheduleType: ['cron'] },
		},
		default: '',
		placeholder: '0 6 * * 1-5',
		description: 'Five fields: minute, hour, day of month, month, day of week',
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		displayOptions: {
			show: { resource: ['monitor'], operation: ['create'], scheduleType: ['cron'] },
		},
		default: 'UTC',
		placeholder: 'Europe/Berlin',
		description:
			'The IANA timezone the cron expression is in. Use the one your n8n instance runs in.',
	},
	{
		displayName: 'Grace',
		name: 'grace',
		type: 'string',
		displayOptions: showFor(['create']),
		default: '10m',
		placeholder: '10m',
		description:
			'How late a ping may be before you are alerted, such as 10m. Allow for the run itself and for n8n starting it late. A calculator is at https://vivere.dev/tools/grace-period.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: showFor(['create']),
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Page Name or ID',
				name: 'page',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPages' },
				default: '',
				description:
					'The page to add the monitor to. Defaults to your first page. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Public',
				name: 'public',
				type: 'boolean',
				default: false,
				description: 'Whether the monitor shows on the public status page and can have a badge',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'n8n, billing',
				description: 'Comma-separated tags',
			},
		],
	},
];

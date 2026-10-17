import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class VivereApi implements ICredentialType {
	name = 'vivereApi';

	displayName = 'Vivere API';

	icon: Icon = {
		light: 'file:../nodes/Vivere/vivere.svg',
		dark: 'file:../nodes/Vivere/vivere.dark.svg',
	};

	documentationUrl = 'https://github.com/nicholasbergesen/n8n-nodes-vivere#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'vv_...',
			description: 'Create one at https://vivere.dev/app/keys. Keys start with vv_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://vivere.dev/api/v1',
			url: '/pages',
		},
	};
}

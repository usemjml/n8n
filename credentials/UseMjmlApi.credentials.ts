import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UseMjmlApi implements ICredentialType {
	name = 'useMjmlApi';

	displayName = 'UseMJML API';

	icon: Icon = { light: 'file:usemjml.svg', dark: 'file:usemjml.dark.svg' };

	// Community packages must use a full external URL here.
	documentationUrl = 'https://usemjml.com/#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'mjml_…',
			description:
				'Your usemjml API key. Get one for free via e-mail registration at usemjml.com. Optional for rendering and validating, but gives you your own rate limit instead of the shared anonymous one.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://usemjml.com',
			description:
				'Only change this if you run your own instance of the open-source usemjml server',
		},
	];

	// usemjml accepts "X-API-Key", "Authorization: ApiKey" and "Authorization: Bearer".
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// A valid key returns 200 for POST /api/me, an invalid or not yet activated key returns 401.
	// The call does not count against the rate limit.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/api/me',
			method: 'POST',
		},
	};
}

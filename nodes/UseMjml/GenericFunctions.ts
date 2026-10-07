import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const USEMJML_BASE_URL = 'https://usemjml.com';

export type UseMjmlEndpoint = '/api/render' | '/api/validate';

/** The MJML input field, shared verbatim across both usemjml nodes. */
export const MJML_PROPERTY: INodeProperties = {
	displayName: 'MJML',
	name: 'mjml',
	type: 'string',
	typeOptions: { rows: 10 },
	default: '',
	required: true,
	placeholder:
		'<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>',
	description: 'The MJML template (max. 2 MiB). mj-include is not supported.',
};

/** The validationLevel option, shared by both nodes. */
export const VALIDATION_LEVEL_OPTION: INodeProperties = {
	displayName: 'Validation Level',
	name: 'validationLevel',
	type: 'options',
	options: [
		{
			name: 'Skip',
			value: 'skip',
			description: 'Only catch what cannot be parsed at all',
		},
		{
			name: 'Soft',
			value: 'soft',
			description: 'Render anyway and report validation errors',
		},
		{
			name: 'Strict',
			value: 'strict',
			description: 'Refuse to render an invalid template',
		},
	],
	default: 'soft',
	description: 'How strictly MJML validates the template',
};

/**
 * Reads the (optional) usemjml credential. Returns `null` when no credential is
 * configured — both endpoints work anonymously on the shared rate limit. Kept
 * separate from {@link useMjmlApiRequest} so the request function never mixes
 * credential retrieval with a raw `httpRequest` call (see the
 * `no-http-request-with-manual-auth` lint rule).
 */
async function getUseMjmlCredential(this: IExecuteFunctions): Promise<IDataObject | null> {
	try {
		const credentials = await this.getCredentials('useMjmlApi');
		if (((credentials?.apiKey as string) ?? '').trim() === '') return null;
		return credentials;
	} catch {
		// No credential configured — fine, the API key is optional.
		return null;
	}
}

/**
 * Sends an MJML template to usemjml. If a `useMjmlApi` credential is set, n8n
 * injects the "X-API-Key" header via the credential's `authenticate` block
 * (using `httpRequestWithAuthentication`) and the credential's base URL is used;
 * otherwise the request goes anonymously to usemjml.com.
 */
export async function useMjmlApiRequest(
	this: IExecuteFunctions,
	endpoint: UseMjmlEndpoint,
	mjml: string,
	config: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await getUseMjmlCredential.call(this);
	const baseUrl = ((credentials?.baseUrl as string) || USEMJML_BASE_URL).replace(/\/+$/, '');

	const body: IDataObject = { mjml };
	if (Object.keys(config).length > 0) {
		body.config = config;
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}${endpoint}`,
		headers: {
			// /api/render answers text/html unless JSON is requested explicitly.
			Accept: 'application/json',
		},
		body,
		json: true,
	};

	this.logger.debug('usemjml API request', {
		node: this.getNode().name,
		url: options.url,
		config,
		templateLength: mjml.length,
		authenticated: credentials !== null,
	});

	try {
		if (credentials !== null) {
			return (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'useMjmlApi',
				options,
			)) as IDataObject;
		}
		return (await this.helpers.httpRequest(options)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
	}
}

/** Reads the MJML parameter and fails early on an empty template (the API would answer 422). */
export function getMjmlParameter(ctx: IExecuteFunctions, itemIndex: number): string {
	const mjml = String(ctx.getNodeParameter('mjml', itemIndex, '') ?? '');
	if (mjml.trim() === '') {
		throw new NodeApiError(
			ctx.getNode(),
			{ message: 'The MJML template is empty.' },
			{ itemIndex, description: 'Enter an MJML template or map one from a previous node.' },
		);
	}
	return mjml;
}

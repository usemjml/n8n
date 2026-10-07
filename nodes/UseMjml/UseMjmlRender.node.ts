import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import {
	getMjmlParameter,
	MJML_PROPERTY,
	useMjmlApiRequest,
	VALIDATION_LEVEL_OPTION,
} from './GenericFunctions';

interface IFontEntry {
	name?: string;
	url?: string;
}

export class UseMjmlRender implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MJML Render',
		name: 'useMjmlRender',
		icon: { light: 'file:usemjml.svg', dark: 'file:usemjml.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'MJML → HTML',
		description: 'Render MJML to responsive email HTML via usemjml.com',
		defaults: {
			name: 'MJML Render',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'useMjmlApi',
				// Optional: rendering works anonymously, a key gives you your own rate limit.
				required: false,
			},
		],
		properties: [
			MJML_PROPERTY,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Beautify',
						name: 'beautify',
						type: 'boolean',
						default: false,
						description: 'Whether to pretty-print the generated HTML',
					},
					{
						displayName: 'Fonts',
						name: 'fonts',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						placeholder: 'Add Font',
						default: {},
						description: 'Web fonts the template may reference. Replaces the MJML default fonts.',
						options: [
							{
								displayName: 'Font',
								name: 'font',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										placeholder: 'Roboto',
										description: 'Font family name as used in the template',
									},
									{
										displayName: 'URL',
										name: 'url',
										type: 'string',
										default: '',
										placeholder: 'https://fonts.googleapis.com/css?family=Roboto',
										description: 'HTTPS URL of the font stylesheet',
									},
								],
							},
						],
					},
					{
						displayName: 'Keep Comments',
						name: 'keepComments',
						type: 'boolean',
						default: true,
						description: 'Whether to keep HTML comments in the output',
					},
					{
						displayName: 'Minify',
						name: 'minify',
						type: 'boolean',
						default: false,
						description: 'Whether to minify the generated HTML',
					},
					{
						...VALIDATION_LEVEL_OPTION,
						description:
							'How strictly MJML validates the template. "Strict" makes the node fail on an invalid template.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const mjml = getMjmlParameter(this, i);
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				const config: IDataObject = {};
				for (const key of ['validationLevel', 'minify', 'beautify', 'keepComments']) {
					if (options[key] !== undefined) config[key] = options[key];
				}

				const fontEntries = ((options.fonts as IDataObject)?.font ?? []) as IFontEntry[];
				const fonts: IDataObject = {};
				for (const { name, url } of fontEntries) {
					if (name?.trim() && url?.trim()) fonts[name.trim()] = url.trim();
				}
				if (Object.keys(fonts).length > 0) config.fonts = fonts;

				// { html, errors, mjml } — "mjml" is the MJML version that rendered the template.
				const response = await useMjmlApiRequest.call(this, '/api/render', mjml, config, i);

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

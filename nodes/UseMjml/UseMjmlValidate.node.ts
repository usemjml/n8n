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

export class UseMjmlValidate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MJML Validate',
		name: 'useMjmlValidate',
		icon: { light: 'file:usemjml.svg', dark: 'file:usemjml.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ "Level: " + ($parameter["options"]["validationLevel"] || "soft") }}',
		description: 'Validate an MJML template via usemjml.com',
		defaults: {
			name: 'MJML Validate',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'useMjmlApi',
				// Optional: validating works anonymously, a key gives you your own rate limit.
				required: false,
			},
		],
		properties: [
			MJML_PROPERTY,
			{
				displayName:
					'An invalid template is not an error: the node returns <code>valid: false</code> together with the errors. Use an If node on <code>valid</code> to branch.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [VALIDATION_LEVEL_OPTION],
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
				if (options.validationLevel !== undefined) {
					config.validationLevel = options.validationLevel;
				}

				// Always 200: { valid, errors, validationLevel, mjml }.
				const response = await useMjmlApiRequest.call(this, '/api/validate', mjml, config, i);

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

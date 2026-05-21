/**
 * get_device Tool Definition
 * Get a specific device by reference
 */

import { z } from 'zod';

/**
 * get_device tool parameters
 */
const GetDeviceParamsSchema = z.object({
  deviceRef: z.string().describe('Device reference returned by list_devices'),
});

/** Type for get_device parameters */
export type GetDeviceParams = z.infer<typeof GetDeviceParamsSchema>;

/**
 * get_device MCP Tool Definition
 *
 * @see https://spec.modelcontextprotocol.io/latest/basic/tools/
 */
export const GET_DEVICE_TOOL = {
  name: 'get_device',
  description:
    'Get a specific device by deviceRef returned from list_devices. Returns detailed device information including label, description, location, group, and control parameters.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      deviceRef: {
        type: 'string',
        description: 'Device reference returned by list_devices',
      },
    },
    required: ['deviceRef'],
  },
  metadata: {
    name: 'get_device',
    description:
      'Get a specific device by deviceRef returned from list_devices. Returns detailed device information including label, description, location, group, and control parameters.',
    readOnlyHint: true,
    securitySchemes: {
      oauth2: {
        type: 'oauth2',
        flows: {
          implicit: {
            scopes: {
              'mcp.tools.read': 'Read access to MCP tools',
            },
          },
        },
      },
    },
  },
  schema: GetDeviceParamsSchema,
  _meta: {
    ui: {
      resourceUri: 'ui://widget/device-app.html',
      visibility: ['model', 'app'],
    },
    'ui/resourceUri': 'ui://widget/device-app.html',
    'openai/outputTemplate': 'ui://widget/device-app.html',
    'openai/widgetAccessible': true,
    'openai/resultCanProduceWidget': true,
    'openai/toolInvocation/invoking': 'Loading device details...',
    'openai/toolInvocation/invoked': 'Device loaded',
    'openai/widgetDescription':
      'Interactive device dashboard is displayed as a widget. Do not describe it in text.',
  },
};

/**
 * get_location_state Tool Definition
 * Get the current state of all devices in a location
 */

import { z } from 'zod';

/**
 * get_location_state tool parameters
 */
const GetLocationStateParamsSchema = z.object({
  locationRef: z.string().describe('Location reference returned by list_locations'),
});

/** Type for get_location_state parameters */
export type GetLocationStateParams = z.infer<typeof GetLocationStateParamsSchema>;

/**
 * get_location_state MCP Tool Definition
 *
 * @see https://spec.modelcontextprotocol.io/latest/basic/tools/
 */
export const GET_LOCATION_STATE_TOOL = {
  name: 'get_location_state',
  description:
    'Get the current state of all devices in a location by locationRef returned from list_locations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      locationRef: {
        type: 'string',
        description: 'Location reference returned by list_locations',
      },
    },
    required: ['locationRef'],
  },
  metadata: {
    name: 'get_location_state',
    description:
      'Get the current state of all devices in a location by locationRef returned from list_locations.',
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
  schema: GetLocationStateParamsSchema,
};

/**
 * get_device_state_by_mac Tool Definition
 * Get device state by MAC address within a location
 */

import { z } from 'zod';

/**
 * get_device_state_by_mac tool parameters
 */
const GetDeviceStateByMacParamsSchema = z.object({
  locationRef: z.string().describe('Location reference returned by list_locations'),
  macAddress: z.string().describe('Device MAC address'),
});

/** Type for get_device_state_by_mac parameters */
export type GetDeviceStateByMacParams = z.infer<typeof GetDeviceStateByMacParamsSchema>;

/**
 * get_device_state_by_mac MCP Tool Definition
 *
 * @see https://spec.modelcontextprotocol.io/latest/basic/tools/
 */
export const GET_DEVICE_STATE_BY_MAC_TOOL = {
  name: 'get_device_state_by_mac',
  description:
    'Get device state by MAC address within a locationRef returned from list_locations. Returns human-readable state like get_device_state: { macAddress, power, mode, temperature, brightness, kelvin, ... }. Multi-element devices return { macAddress, elementCount, elements }.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      locationRef: {
        type: 'string',
        description: 'Location reference returned by list_locations',
      },
      macAddress: {
        type: 'string',
        description: 'Device MAC address',
      },
    },
    required: ['locationRef', 'macAddress'],
  },
  metadata: {
    name: 'get_device_state_by_mac',
    description:
      'Get device state by MAC address within a locationRef returned from list_locations. Returns human-readable state like get_device_state: { macAddress, power, mode, temperature, brightness, kelvin, ... }. Multi-element devices return { macAddress, elementCount, elements }.',
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
  schema: GetDeviceStateByMacParamsSchema,
};

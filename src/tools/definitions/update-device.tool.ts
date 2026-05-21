/**
 * update_device Tool Definition
 * Update device properties like label, description, location, or group
 */

import { z } from 'zod';

/**
 * update_device tool parameters
 */
const UpdateDeviceParamsSchema = z.object({
  deviceRef: z.string().describe('Device reference returned by list_devices'),
  label: z.string().nullish().describe('Optional new label for the device'),
  desc: z.string().nullish().describe('Optional new description for the device'),
  locationRef: z.string().nullish().describe('Optional new location reference to move the device'),
  groupRef: z.string().nullish().describe('Optional new group reference to assign the device'),
});

/** Type for update_device parameters */
export type UpdateDeviceParams = z.infer<typeof UpdateDeviceParamsSchema>;

/**
 * update_device MCP Tool Definition
 *
 * @see https://spec.modelcontextprotocol.io/latest/basic/tools/
 */
export const UPDATE_DEVICE_TOOL = {
  name: 'update_device',
  description:
    'Update device properties. You can update label, description, location, or group. At least one optional field must be provided.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      deviceRef: {
        type: 'string',
        description: 'Device reference returned by list_devices',
      },
      label: {
        type: ['string', 'null'],
        description: 'Optional new label for the device',
      },
      desc: {
        type: ['string', 'null'],
        description: 'Optional new description for the device',
      },
      locationRef: {
        type: ['string', 'null'],
        description: 'Optional new location reference to move the device',
      },
      groupRef: {
        type: ['string', 'null'],
        description: 'Optional new group reference to assign the device',
      },
    },
    required: ['deviceRef'],
  },
  metadata: {
    name: 'update_device',
    description:
      'Update device properties. You can update label, description, location, or group. At least one optional field must be provided.',
    readOnlyHint: false,
    destructiveHint: false,
    securitySchemes: {
      oauth2: {
        type: 'oauth2',
        flows: {
          implicit: {
            scopes: {
              'mcp.tools.write': 'Write access to MCP tools',
            },
          },
        },
      },
    },
  },
  schema: UpdateDeviceParamsSchema,
};

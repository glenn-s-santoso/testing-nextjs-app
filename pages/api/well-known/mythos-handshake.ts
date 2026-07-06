import type { NextApiRequest, NextApiResponse } from 'next';
import { handshakeRoute } from '@mythos/sdk';

const handler = handshakeRoute();

export default function mythosHandshake(req: NextApiRequest, res: NextApiResponse) {
  return handler(req as any, res as any, () => {});
}

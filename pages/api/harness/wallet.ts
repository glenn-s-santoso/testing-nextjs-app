import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '../../../lib/config';
import { getWallet } from '../../../lib/mythos-api-client';

export default async function harnessWallet(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  if (!bearerToken) {
    res.status(401).json({ success: false, error: 'Missing Authorization header' });
    return;
  }

  try {
    const { mythosApiUrl } = getConfig();
    const wallet = await getWallet(mythosApiUrl, bearerToken);
    res.status(200).json({ success: true, data: wallet });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ success: false, error: message });
  }
}

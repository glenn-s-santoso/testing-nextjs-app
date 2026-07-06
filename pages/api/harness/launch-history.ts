import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '../../../lib/config';
import { getLaunchHistory } from '../../../lib/mythos-api-client';

export default async function harnessLaunchHistory(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  if (!bearerToken) {
    res.status(401).json({ success: false, error: 'Missing Authorization header' });
    return;
  }

  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  try {
    const { mythosApiUrl } = getConfig();
    const result = await getLaunchHistory(mythosApiUrl, bearerToken, limit, offset);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ success: false, error: message });
  }
}

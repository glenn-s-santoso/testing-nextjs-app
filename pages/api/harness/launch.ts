import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig, requireListingId } from '../../../lib/config';
import { launchApp } from '../../../lib/mythos-api-client';

export default async function harnessLaunch(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  if (!bearerToken) {
    res.status(401).json({ success: false, error: 'Missing Authorization header' });
    return;
  }

  try {
    const { mythosApiUrl } = getConfig();
    const listingId = requireListingId();
    const result = await launchApp(mythosApiUrl, bearerToken, listingId);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ success: false, error: message });
  }
}

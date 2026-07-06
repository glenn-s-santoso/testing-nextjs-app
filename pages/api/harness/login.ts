import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '../../../lib/config';
import { login } from '../../../lib/mythos-api-client';

export default async function harnessLogin(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Missing email or password' });
    return;
  }

  try {
    const { mythosApiUrl } = getConfig();
    const result = await login(mythosApiUrl, email, password);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(401).json({ success: false, error: message });
  }
}

import { jsonBody } from './_lib/body.js'
import { ensureUser } from './_lib/db.js'
import { passcodeMatches } from './_lib/config.js'
import { setSessionCookie, signSession } from './_lib/session.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!process.env.SESSION_SECRET || !process.env.PASSCODE || !process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'server_not_configured' })
  }
  try {
    const { passcode } = jsonBody(req)
    if (!passcodeMatches(passcode)) {
      await delay(300)
      return res.status(401).json({ error: 'invalid_passcode' })
    }
    await ensureUser()
    setSessionCookie(res, signSession())
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('login failed:', error)
    return res.status(500).json({ error: 'server_error' })
  }
}

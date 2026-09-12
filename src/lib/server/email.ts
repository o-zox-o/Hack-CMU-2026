/**
 * Transactional email, sent through Resend's HTTP API.
 *
 * No SDK — it's one POST to https://api.resend.com/emails with a bearer token,
 * so there's nothing extra to install or keep up to date.
 *
 * Set RESEND_API_KEY (and optionally EMAIL_FROM) in .env / Vercel. Without a
 * key this logs what it *would* have sent and returns — so joining an activity
 * works exactly the same whether or not email is configured.
 */

import { env } from '$env/dynamic/private';
import { formatPrice, formatWhen } from '$lib/format';
import { getUserEmail } from './db';
import type { ActivityView, User } from '$lib/types';

const ENDPOINT = 'https://api.resend.com/emails';

/* Resend's shared sandbox sender works with no domain setup, but only delivers
   to the address that owns the Resend account. Point EMAIL_FROM at your own
   verified domain to reach everyone. */
const DEFAULT_FROM = 'Tagalong <onboarding@resend.dev>';

interface Mail {
	to: string;
	subject: string;
	html: string;
	text: string;
}

export type MailResult =
	{ ok: true } | { ok: false; reason: 'not-configured' | 'rejected' | 'error'; detail?: string };

async function send(mail: Mail): Promise<MailResult> {
	const key = env.RESEND_API_KEY;
	if (!key) {
		console.log(`[email] skipped (no RESEND_API_KEY) — would send "${mail.subject}" to ${mail.to}`);
		return { ok: false, reason: 'not-configured' };
	}

	try {
		const res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
			body: JSON.stringify({ from: env.EMAIL_FROM || DEFAULT_FROM, ...mail })
		});

		if (!res.ok) {
			const detail = (await res.text()).slice(0, 200);
			console.error(`[email] ${res.status} from Resend: ${detail}`);
			return { ok: false, reason: 'rejected', detail };
		}

		console.log(`[email] sent "${mail.subject}" to ${mail.to}`);
		return { ok: true };
	} catch (err) {
		console.error('[email] request failed:', err);
		return { ok: false, reason: 'error', detail: String(err) };
	}
}

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Tell the host that someone joined. Never throws and never blocks the join —
 * a bad API key means a logged warning, not a failed request.
 */
export async function notifyHostOfJoin(
	activity: ActivityView,
	joiner: User,
	origin: string
): Promise<MailResult> {
	// Don't email yourself for joining your own activity.
	if (activity.host.id === joiner.id) return { ok: false, reason: 'not-configured' };

	const to = await getUserEmail(activity.host.id);
	if (!to) return { ok: false, reason: 'not-configured' };

	const link = `${origin}/activities/${activity.id}`;
	const when = formatWhen(activity.startsAt);
	const price = formatPrice(activity.costCents, activity.costBasis);
	const spots = activity.isFull
		? "That's everyone — you're full."
		: `${activity.spotsLeft} spot${activity.spotsLeft === 1 ? '' : 's'} left.`;

	const text = [
		`${joiner.name} (@${joiner.handle}) joined "${activity.title}".`,
		'',
		`When:  ${when}`,
		`Where: ${activity.location}`,
		`Cost:  ${price}`,
		`Who's in: ${activity.spotsTaken} of ${activity.spots}. ${spots}`,
		'',
		link
	].join('\n');

	const html = `
<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221f18;background:#fffdf7">
  <p style="margin:0 0 4px;font-size:13px;color:#857f70">tagalong</p>
  <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">
    ${escape(joiner.name)} joined your activity
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5">
    <strong>${escape(joiner.name)}</strong> (@${escape(joiner.handle)}) is in for
    <strong>${escape(activity.title)}</strong>.
  </p>
  <table style="width:100%;border-collapse:collapse;background:#f2ecdd;border-radius:8px;font-size:14px">
    <tr><td style="padding:10px 14px;color:#857f70">When</td><td style="padding:10px 14px;font-weight:600">${escape(when)}</td></tr>
    <tr><td style="padding:10px 14px;color:#857f70">Where</td><td style="padding:10px 14px;font-weight:600">${escape(activity.location)}</td></tr>
    <tr><td style="padding:10px 14px;color:#857f70">Cost</td><td style="padding:10px 14px;font-weight:600">${escape(price)}</td></tr>
    <tr><td style="padding:10px 14px;color:#857f70">Spots</td><td style="padding:10px 14px;font-weight:600">${activity.spotsTaken} of ${activity.spots} — ${escape(spots)}</td></tr>
  </table>
  <p style="margin:20px 0 0">
    <a href="${link}" style="display:inline-block;background:#46a53c;color:#fffdf7;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:14px">
      View the activity
    </a>
  </p>
</div>`.trim();

	return send({ to, subject: `${joiner.name} joined "${activity.title}"`, html, text });
}

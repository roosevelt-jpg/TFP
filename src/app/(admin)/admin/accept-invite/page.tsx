import { AcceptInviteForm } from "@/components/admin/AcceptInviteForm";
import { db } from "@/db";
import { hashInviteToken } from "@/lib/admin/invites";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="tfp-command cmd-auth-shell" data-theme="dark">
        <div className="cmd-auth-card">
          <h1>Invalid invite</h1>
          <p className="cmd-auth-lead">
            This invite link is missing a token. Ask Kane to resend it via
            Resend.
          </p>
        </div>
      </div>
    );
  }

  const invite = await db.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
  });
  if (
    !invite ||
    invite.acceptedAt ||
    invite.expiresAt.getTime() < Date.now()
  ) {
    return (
      <div className="tfp-command cmd-auth-shell" data-theme="dark">
        <div className="cmd-auth-card">
          <h1>Invite unavailable</h1>
          <p className="cmd-auth-lead">
            This link is expired or already used. Ask Kane to send a new invite
            email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AcceptInviteForm
      token={token}
      emailHint={invite.email}
      roleHint={invite.role}
    />
  );
}

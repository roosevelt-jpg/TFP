import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { Client360Forms } from "@/components/admin/Client360Forms";
import {
  getClient360,
  resolveClientPersonId,
} from "@/lib/admin/clients";
import { requireAdminSession } from "@/lib/auth/session";

type Props = {
  params: Promise<{ id: string }>;
};

function gbp(pence: number, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(pence / 100);
}

export default async function ClientDetailPage({ params }: Props) {
  await requireAdminSession(["kane", "lemoni", "leah"]);
  const { id: rawId } = await params;
  const personId = await resolveClientPersonId(rawId);
  if (!personId) notFound();

  const data = await getClient360(personId);
  if (!data) notFound();

  const { person, bio, tiers, payments } = data;
  const dob =
    bio.dateOfBirth instanceof Date
      ? bio.dateOfBirth.toISOString().slice(0, 10)
      : bio.dateOfBirth
        ? String(bio.dateOfBirth).slice(0, 10)
        : null;

  return (
    <AdminShell titleKey={`${person.name}`}>
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <Link href="/admin/clients">← Clients</Link>
          {" · "}
          Joined {person.joinedAt.toLocaleDateString("en-GB")}
          {person.customerId ? " · programme buyer" : " · warehouse contact"}
        </div>
      </div>

      <div className="cmd-client-hero">
        <div className="cmd-avatar cmd-avatar-xl">
          {person.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.image} alt="" />
          ) : (
            <span>{initials(person.name)}</span>
          )}
        </div>
        <div className="cmd-client-hero-main">
          <h2 className="cmd-client-name">{person.name}</h2>
          <div className="cmd-client-meta">
            <span>{person.email}</span>
            {person.phone ? <span>{person.phone}</span> : null}
            {person.igHandle ? <span>@{person.igHandle.replace(/^@/, "")}</span> : null}
          </div>
          <div className="cmd-client-badges">
            {tiers.activeTier.length === 0 ? (
              <span className="cmd-badge cmd-badge-recorded">No active plan</span>
            ) : (
              tiers.activeTier.map((t) => (
                <span className="cmd-badge cmd-badge-live" key={t}>
                  {t}
                </span>
              ))
            )}
            <span className="cmd-badge cmd-badge-verified">
              {data.sessionsTaken} sessions taken
            </span>
            <span className="cmd-badge cmd-badge-calculated">
              LTV {payments.lifetimeLabel}
            </span>
          </div>
        </div>
        <div className="cmd-kpi-mini">
          <div className="l">Date joined</div>
          <div className="v">{person.joinedAt.toLocaleDateString("en-GB")}</div>
        </div>
      </div>

      <div className="cmd-kpi-grid" style={{ marginBottom: 16 }}>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Assigned staff</div>
          <div className="cmd-kpi-value" style={{ fontSize: 18 }}>
            {data.assignedStaff.length
              ? data.assignedStaff.map((a) => a.staffName).join(", ")
              : "Unassigned"}
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Channels</div>
          <div className="cmd-kpi-value" style={{ fontSize: 18 }}>
            {data.channels.map((c) => c.channel).join(", ") || "—"}
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Stripe / Shopify</div>
          <div className="cmd-kpi-value" style={{ fontSize: 14 }}>
            {[person.stripeId, person.shopifyId].filter(Boolean).join(" · ") ||
              "—"}
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Biographic data</div>
          </div>
          <div className="cmd-panel-body">
            <dl className="cmd-dl">
              <div>
                <dt>Goal</dt>
                <dd>{bio.goal ?? "—"}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{bio.level ?? "—"}</dd>
              </div>
              <div>
                <dt>Sex</dt>
                <dd>{bio.sex ?? "—"}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{bio.age ?? "—"}</dd>
              </div>
              <div>
                <dt>Height</dt>
                <dd>{bio.heightCm ? `${bio.heightCm} cm` : "—"}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{bio.weightKg ? `${bio.weightKg} kg` : "—"}</dd>
              </div>
              <div>
                <dt>Goal weight</dt>
                <dd>{bio.goalWeightKg ? `${bio.goalWeightKg} kg` : "—"}</dd>
              </div>
              <div>
                <dt>Diet</dt>
                <dd>{bio.diet ?? "—"}</dd>
              </div>
              <div>
                <dt>Injuries</dt>
                <dd>{bio.injuries ?? "—"}</dd>
              </div>
              <div>
                <dt>Country / TZ</dt>
                <dd>
                  {[bio.country, bio.timezone].filter(Boolean).join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt>DOB</dt>
                <dd>{dob ?? "—"}</dd>
              </div>
              <div>
                <dt>Bio notes</dt>
                <dd>{bio.bioSummary ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Plans / tiers &amp; coaching</div>
          </div>
          <div className="cmd-panel-body">
            {tiers.enrolments.length === 0 &&
            tiers.subscriptions.length === 0 ? (
              <div className="cmd-list-sub">No enrolments or subscriptions</div>
            ) : null}
            {tiers.enrolments.map((e) => (
              <div className="cmd-list-row" key={e.id}>
                <div>
                  <div className="cmd-list-title">
                    {e.line}
                    {e.tier ? ` · ${e.tier}` : ""}
                  </div>
                  <div className="cmd-list-sub">
                    {e.status} · week {e.currentWeek} · started{" "}
                    {e.startDate.toLocaleDateString("en-GB")} ·{" "}
                    {gbp(e.pricePence)}
                  </div>
                </div>
              </div>
            ))}
            {tiers.subscriptions.map((s) => (
              <div className="cmd-list-row" key={s.id}>
                <div>
                  <div className="cmd-list-title">{s.stripePriceId}</div>
                  <div className="cmd-list-sub">
                    {s.status}
                    {s.currentPeriodEnd
                      ? ` · renews ${s.currentPeriodEnd.toLocaleDateString("en-GB")}`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Payment history</div>
            <div className="cmd-panel-sub">Lifetime {payments.lifetimeLabel}</div>
          </div>
          <div className="cmd-panel-body">
            {payments.purchases.map((p) => (
              <div className="cmd-list-row" key={p.id}>
                <div>
                  <div className="cmd-list-title">
                    {gbp(p.amountTotal, p.currency)} · {p.ref}
                  </div>
                  <div className="cmd-list-sub">
                    {p.status}
                    {p.promoCode ? ` · ${p.promoCode}` : ""} ·{" "}
                    {(p.purchasedAt ?? p.createdAt).toLocaleString("en-GB")}
                  </div>
                </div>
              </div>
            ))}
            {payments.warehouse.map((p) => (
              <div className="cmd-list-row" key={p.id}>
                <div>
                  <div className="cmd-list-title">
                    {gbp(p.amountPence, p.currency)}
                    {p.productTier ? ` · ${p.productTier}` : ""}
                  </div>
                  <div className="cmd-list-sub">
                    {p.businessLine} · {p.status}
                    {p.paidAt ? ` · ${p.paidAt.toLocaleString("en-GB")}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {payments.purchases.length === 0 &&
            payments.warehouse.length === 0 ? (
              <div className="cmd-list-sub">No payments recorded</div>
            ) : null}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">
              Sessions taken ({data.sessionsTaken})
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.sessions.map((s) => (
              <div className="cmd-list-row" key={s.id}>
                <div>
                  <div className="cmd-list-title">{s.title}</div>
                  <div className="cmd-list-sub">
                    {s.type} · {s.status} ·{" "}
                    {s.scheduledAt.toLocaleString("en-GB")}
                    {s.durationMin ? ` · ${s.durationMin}m` : ""}
                    {s.staffPersonKey ? ` · ${s.staffPersonKey}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {data.calls.map((c) => (
              <div className="cmd-list-row" key={c.id}>
                <div>
                  <div className="cmd-list-title">
                    {c.eventType || "Calendly call"}
                  </div>
                  <div className="cmd-list-sub">
                    {c.outcome} · {c.scheduledAt.toLocaleString("en-GB")}
                    {c.setter ? ` · setter ${c.setter}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {data.sessions.length === 0 && data.calls.length === 0 ? (
              <div className="cmd-list-sub">No sessions logged yet</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Consent</div>
          </div>
          <div className="cmd-panel-body">
            {data.consents.length === 0 ? (
              <div className="cmd-list-sub">No consent records</div>
            ) : (
              data.consents.map((c) => (
                <div className="cmd-list-row" key={c.id}>
                  <div>
                    <div className="cmd-list-title">
                      {c.channel} · {c.purpose} · {c.status}
                    </div>
                    <div className="cmd-list-sub">
                      {c.source} · {c.policyVersion} ·{" "}
                      {c.capturedAt.toLocaleString("en-GB")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Channel identities</div>
          </div>
          <div className="cmd-panel-body">
            {data.channels.map((c) => (
              <div className="cmd-list-row" key={c.id}>
                <div>
                  <div className="cmd-list-title">{c.channel}</div>
                  <div className="cmd-list-sub">
                    {c.address || c.externalUserId} · {c.status}
                  </div>
                </div>
              </div>
            ))}
            {data.attribution ? (
              <div className="cmd-list-row">
                <div>
                  <div className="cmd-list-title">Attribution</div>
                  <div className="cmd-list-sub">
                    {[
                      data.attribution.utmSource,
                      data.attribution.utmMedium,
                      data.attribution.utmCampaign,
                      data.attribution.landingPath,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">History / activity timeline</div>
        </div>
        <div className="cmd-panel-body">
          {data.timeline.length === 0 ? (
            <div className="cmd-list-sub">No timeline events yet</div>
          ) : (
            data.timeline.map((item) => (
              <div className="cmd-list-row" key={item.id}>
                <div>
                  <div className="cmd-list-title">
                    <span className="cmd-badge cmd-badge-recorded">
                      {item.kind}
                    </span>{" "}
                    {item.title}
                  </div>
                  <div className="cmd-list-sub">
                    {item.at.toLocaleString("en-GB")}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {data.notes.length > 0 ? (
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Notes</div>
          </div>
          <div className="cmd-panel-body">
            {data.notes.map((n) => (
              <div className="cmd-list-row" key={n.id}>
                <div>
                  <div className="cmd-list-title">
                    {n.pinned ? "Pinned · " : ""}
                    {n.authorEmail}
                  </div>
                  <div className="cmd-list-sub">
                    {n.createdAt.toLocaleString("en-GB")}
                  </div>
                  <div style={{ marginTop: 6 }}>{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data.orders.length > 0 ? (
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Shopify / warehouse orders</div>
          </div>
          <div className="cmd-panel-body">
            {data.orders.map((o) => (
              <div className="cmd-list-row" key={o.id}>
                <div>
                  <div className="cmd-list-title">
                    {o.orderName || o.shopifyOrderId} · {gbp(o.netPence)}
                  </div>
                  <div className="cmd-list-sub">
                    {o.businessLine}
                    {o.paidAt ? ` · ${o.paidAt.toLocaleString("en-GB")}` : ""}
                    {o.fulfilment
                      ? o.fulfilment.fulfilledAt
                        ? " · fulfilled"
                        : " · awaiting fulfilment"
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Client360Forms
        personId={person.id}
        name={person.name}
        phone={person.phone}
        country={bio.country}
        timezone={bio.timezone}
        dateOfBirth={dob}
        bioSummary={bio.bioSummary}
        igHandle={person.igHandle}
        image={person.image}
        assignments={data.assignedStaff.map((a) => ({
          id: a.id,
          staffPersonKey: a.staffPersonKey,
          staffName: a.staffName,
          role: a.role,
          assignedAt: a.assignedAt.toISOString(),
        }))}
      />
    </AdminShell>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

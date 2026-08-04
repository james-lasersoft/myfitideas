import type { ReactNode } from "react";
import "./SecurityCards.css";

export interface SecurityLocation {
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface SecurityRecordData {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  location: SecurityLocation;
}

interface DeviceDetails {
  browser: string;
  operatingSystem: string;
  category: string;
  icon: string;
}

interface CardLabels {
  browser: string;
  operatingSystem: string;
  deviceType: string;
  approximateLocation: string;
  ipAddress: string;
  created: string;
  lastActivity: string;
  expires: string;
  locationUnavailable: string;
  ipUnavailable: string;
  localDevelopment: string;
  privateNetwork: string;
}

interface SecurityRecordCardProps {
  record: SecurityRecordData;
  expiresAt: string | null;
  labels: CardLabels;
  current?: boolean;
  currentLabel?: string;
  action: ReactNode;
  translateValue: (value: string) => string;
}

export function parseSecurityDevice(userAgent: string | null): DeviceDetails {
  if (!userAgent) {
    return { browser: "Unknown browser", operatingSystem: "Unknown operating system", category: "Unknown device", icon: "?" };
  }

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("OPR/")
      ? "Opera"
      : userAgent.includes("Chrome/")
        ? "Google Chrome"
        : userAgent.includes("Firefox/")
          ? "Mozilla Firefox"
          : userAgent.includes("Safari/")
            ? "Safari"
            : "Other browser";

  const operatingSystem = userAgent.includes("Windows NT")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS or iPadOS"
        : userAgent.includes("Mac OS X")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown operating system";

  if (/iPad|Tablet/.test(userAgent)) return { browser, operatingSystem, category: "Tablet", icon: "▣" };
  if (/Mobile|Android|iPhone|iPod/.test(userAgent)) return { browser, operatingSystem, category: "Mobile device", icon: "▯" };
  return { browser, operatingSystem, category: "Computer", icon: "▰" };
}

function locationLabel(location: SecurityLocation, unavailable: string): string {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length ? parts.join(", ") : unavailable;
}

function formatIpAddress(ipAddress: string | null, labels: CardLabels): string {
  if (!ipAddress) return labels.ipUnavailable;
  const normalized = ipAddress.startsWith("::ffff:") ? ipAddress.slice(7) : ipAddress;
  if (normalized === "::1" || normalized === "127.0.0.1") return labels.localDevelopment;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized)) return labels.privateNetwork;
  return normalized;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function SecurityField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`security-card-field${wide ? " security-card-field-wide" : ""}`}>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

export function SecurityRecordCard({
  record,
  expiresAt,
  labels,
  current = false,
  currentLabel,
  action,
  translateValue,
}: SecurityRecordCardProps) {
  const device = parseSecurityDevice(record.userAgent);
  const title = `${translateValue(device.browser)} · ${translateValue(device.operatingSystem)}`;

  return (
    <article className={`security-record-card${current ? " is-current" : ""}`}>
      <header className="security-record-card-header">
        <div className="security-record-identity">
          <span className="security-device-icon" aria-hidden="true">{device.icon}</span>
          <div>
            <h3>{title}</h3>
            <p>{translateValue(device.category)}</p>
          </div>
        </div>
        {current && currentLabel ? <span className="current-session-badge">{currentLabel}</span> : null}
      </header>

      <div className="security-card-field-grid">
        <SecurityField label={labels.browser} value={translateValue(device.browser)} />
        <SecurityField label={labels.operatingSystem} value={translateValue(device.operatingSystem)} />
        <SecurityField label={labels.deviceType} value={translateValue(device.category)} />
        <SecurityField label={labels.ipAddress} value={formatIpAddress(record.ipAddress, labels)} />
        <SecurityField label={labels.approximateLocation} value={locationLabel(record.location, labels.locationUnavailable)} wide />
        <SecurityField label={labels.created} value={formatDate(record.createdAt)} />
        <SecurityField label={labels.lastActivity} value={formatDate(record.lastSeenAt)} />
        <SecurityField label={labels.expires} value={formatDate(expiresAt)} />
      </div>

      <footer className="security-record-card-footer">{action}</footer>
    </article>
  );
}

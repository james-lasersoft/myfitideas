import { useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import {
  getMeasurementIllustrationAsset,
  type MeasurementIllustrationMetadata,
  type MeasurementSide,
} from "./measurementSessionModel";

interface MeasurementGuidanceIllustrationProps {
  illustration: MeasurementIllustrationMetadata;
  side?: MeasurementSide;
  decorative?: boolean;
}

export default function MeasurementGuidanceIllustration({
  illustration,
  side,
  decorative = false,
}: MeasurementGuidanceIllustrationProps) {
  const { t } = useLocale();
  const asset = getMeasurementIllustrationAsset(illustration, side);
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const failed = failedAsset === asset;

  return <div
    className="measurement-guidance-illustration"
    data-illustration-status={failed ? "unavailable" : "available"}
  >
    {failed ? <span className="measurement-guidance-illustration-fallback" aria-hidden="true" /> : <img
      src={asset}
      alt={decorative ? "" : t(illustration.altTextSource)}
      aria-hidden={decorative || undefined}
      decoding="async"
      draggable={false}
      onError={() => setFailedAsset(asset)}
    />}
  </div>;
}

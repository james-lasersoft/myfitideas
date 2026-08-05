type BrandLogoProps = {
  variant?: "horizontal" | "symbol";
  className?: string;
  alt?: string;
};

export default function BrandLogo({
  variant = "horizontal",
  className = "",
  alt = "MyFitIdeas",
}: BrandLogoProps) {
  const source =
    variant === "symbol"
      ? "/brand/myfitideas-symbol.svg"
      : "/brand/myfitideas-horizontal.svg";

  return <img className={className} src={source} alt={alt} />;
}

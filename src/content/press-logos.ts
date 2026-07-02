export type PressLogo = {
  src: string;
  alt: string;
  /** Intrinsic pixel dimensions, so next/image keeps each logo's aspect ratio. */
  width: number;
  height: number;
};

export const pressLogos: PressLogo[] = [
  { src: "/press/healthline.png", alt: "Healthline", width: 264, height: 43 },
  { src: "/press/forbes.png", alt: "Forbes", width: 200, height: 50 },
  { src: "/press/webmd.png", alt: "WebMD", width: 232, height: 52 },
  {
    src: "/press/rolling-stone.png",
    alt: "Rolling Stone",
    width: 264,
    height: 47,
  },
  { src: "/press/wired.png", alt: "WIRED", width: 264, height: 53 },
  {
    src: "/press/mens-health.png",
    alt: "Men's Health",
    width: 264,
    height: 54,
  },
  {
    src: "/press/womens-health.png",
    alt: "Women's Health",
    width: 264,
    height: 54,
  },
];

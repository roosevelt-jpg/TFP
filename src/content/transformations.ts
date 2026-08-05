// Kane's branded before/after cards, cropped to the photo panel so the section
// heading carries "Results of accountability" once instead of five times.
// Order is the client's, chosen for visual impact, not the briefs' listing order.
export type Transformation = {
  name: string;
  image: string;
  quote: string;
};

export const transformations: Transformation[] = [
  {
    name: "Mustafa S.",
    image: "/assets/transformations/mustafa-s-crop.jpg",
    quote:
      "Taking The Complete Stack and being held accountable got me the results I wanted.",
  },
  {
    name: "Casey B.",
    image: "/assets/transformations/casey-crop.jpg",
    quote: "The Formula system improved my ability to push myself harder.",
  },
  {
    name: "Mustafa R.",
    image: "/assets/transformations/mustafa-r-crop.jpg",
    quote:
      "Kane set the tone and the standard. I followed it and got the results.",
  },
  {
    name: "Ben K.",
    image: "/assets/transformations/ben-crop.jpg",
    quote:
      "Following The Formula training system made me realise I could lose the weight I never thought I could with this programme.",
  },
  {
    name: "Jamie H.",
    image: "/assets/transformations/jamie-crop.jpg",
    quote:
      "Kane held me accountable every step of the way. Now I don't need him because the discipline is built.",
  },
];

export type Inline = string | { b: string } | { link: string; href: string };

export type Block =
  | { type: "p"; content: Inline[] }
  | { type: "ul"; items: Inline[][] };

export type LegalSection = {
  heading: string;
  blocks: Block[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

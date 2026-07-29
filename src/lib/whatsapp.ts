// WhatsApp rules and UK consent law mean nobody can be messaged until they
// message first, so this link is what actually starts the coaching. Without it
// a buyer pays and waits.
export const COACH_WHATSAPP_NUMBER = "447466396911";

const OPT_IN_TEXT = "Hi, I'd like to start my coaching";

// encodeURIComponent leaves an apostrophe raw; the contract from Indigo encodes
// it, so this matches their URL byte for byte rather than trusting their
// matching to be lenient about it.
export const COACH_WHATSAPP_URL = `https://wa.me/${COACH_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  OPT_IN_TEXT,
).replace(/'/g, "%27")}`;

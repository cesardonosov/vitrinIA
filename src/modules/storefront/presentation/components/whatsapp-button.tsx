import { whatsappHref } from "../format";

export interface WhatsAppButtonProps {
  readonly label: string;
  readonly message?: string;
  /** Digits only (`toWhatsAppDigits`); absent while the store has the placeholder number. */
  readonly whatsappDigits?: string;
  readonly className?: string;
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function WhatsAppButton({
  label,
  message,
  whatsappDigits,
  className,
}: WhatsAppButtonProps) {
  const base =
    "inline-flex min-h-touch items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-body font-semibold text-on-primary";
  if (!whatsappDigits) {
    // Placeholder number: never link to a number that is not the seller's.
    return (
      <span
        className={`${base} opacity-60 ${className ?? ""}`}
        aria-disabled="true"
      >
        <WhatsAppIcon />
        {label}
      </span>
    );
  }
  return (
    <a
      href={whatsappHref(whatsappDigits, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} hover:brightness-110 ${className ?? ""}`}
    >
      <WhatsAppIcon />
      {label}
      <span className="sr-only"> (abre WhatsApp)</span>
    </a>
  );
}

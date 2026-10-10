import type { WhatsAppCtaSection } from "@/modules/store-config/application";
import { WhatsAppButton } from "./whatsapp-button";

export type WhatsAppCtaProps = WhatsAppCtaSection["props"] & {
  readonly whatsappDigits?: string;
};

export function WhatsAppCta({
  label,
  message,
  whatsappDigits,
}: WhatsAppCtaProps) {
  return (
    <section className="px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-5xl justify-center">
        <WhatsAppButton
          label={label}
          message={message}
          whatsappDigits={whatsappDigits}
          className="w-full md:w-auto"
        />
      </div>
    </section>
  );
}

import type { TextSection } from "@/modules/store-config/application";
import { paragraphs } from "../format";

export function TextBlock({ title, body }: TextSection["props"]) {
  return (
    <section className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl rounded-lg border border-border p-5 md:p-6">
          {title ? (
            <h2 className="mb-3 font-display text-h3 font-bold break-words">
              {title}
            </h2>
          ) : null}
          <div className="space-y-3 text-body break-words">
            {paragraphs(body).map((p, i) => (
              // Paragraph order is stable for a given text.
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

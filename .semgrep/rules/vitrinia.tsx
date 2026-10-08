declare const html: string;
declare const el: { innerHTML: string };

// ruleid: vitrinia-dangerously-set-inner-html
export const A = () => <div dangerouslySetInnerHTML={{ __html: html }} />;
// ruleid: vitrinia-dangerously-set-inner-html
export const B = { dangerouslySetInnerHTML: { __html: html } };
// ruleid: vitrinia-dangerously-set-inner-html
el.innerHTML = html;
// ok: vitrinia-dangerously-set-inner-html
export const C = () => <div>{html}</div>;

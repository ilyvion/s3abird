import createDOMPurify from "dompurify";
import PostalMime from "postal-mime";

const DOMPurify = createDOMPurify(window);

export default function (email) {
    return PostalMime.parse(email).then((parsed) => {
        parsed.text = DOMPurify.sanitize(parsed.text);
        parsed.html = DOMPurify.sanitize(parsed.html);
        parsed.textAsHtml = textToHtml(parsed.text);

        for (const attachment of parsed.attachments) {
            if (!attachment.contentId) continue;

            const cid = attachment.contentId.replace(/^<|>$/g, ""); // strip angle brackets
            const base64 = btoa(
                new Uint8Array(attachment.content).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ""
                )
            );

            const dataUri = `data:${attachment.contentType};base64,${base64}`;
            const cidRegex = new RegExp(
                `cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
                "g"
            );

            parsed.html = parsed.html.replace(cidRegex, dataUri);
        }

        return parsed;
    });
}

function textToHtml(text) {
    if (!text) return "";

    // Escape HTML special chars
    const escape = (str) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Convert URLs to anchor tags
    const linkify = (str) =>
        str.replace(
            /https?:\/\/[^\s]+/g,
            (url) =>
                `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        );

    // Split paragraphs and wrap in <p>
    return escape(text)
        .split(/\n{2,}/)
        .map((p) => `<p>${linkify(p.replace(/\n/g, "<br>"))}</p>`)
        .join("\n");
}

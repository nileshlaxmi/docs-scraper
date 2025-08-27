import { URL } from "url";  // needed for resolving relative URLs

// Inside scrapeChapter
async function scrapeChapter(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = cleanText($("h1").first().text() || "Untitled");
    let content = `# ${title}\n\n`;

    // Paragraphs, subheadings, code, images
    $("h2, h3, p, pre, img").each((_, el) => {
        const tag = $(el).prop("tagName").toLowerCase();

        if (tag === "h2") {
            content += `## ${cleanText($(el).text())}\n\n`;
        } else if (tag === "h3") {
            content += `### ${cleanText($(el).text())}\n\n`;
        } else if (tag === "p") {
            // include inline images if they exist inside <p>
            if ($(el).find("img").length > 0) {
                $(el).find("img").each((_, imgEl) => {
                    let src = $(imgEl).attr("src");
                    if (src) {
                        // Resolve relative URLs
                        src = new URL(src, url).href;
                        const alt = $(imgEl).attr("alt") || "";
                        content += `![${alt}](${src})\n\n`;
                    }
                });
            } else {
                content += `${cleanText($(el).text())}\n\n`;
            }
        } else if (tag === "pre") {
            content += "``````\n\n";
        } else if (tag === "img") {
            let src = $(el).attr("src");
            if (src) {
                src = new URL(src, url).href;
                const alt = $(el).attr("alt") || "";
                content += `![${alt}](${src})\n\n`;
            }
        }
    });

    // Save to Markdown
    const filename = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    fs.writeFileSync(path.join(OUTPUT_DIR, filename + ".md"), content, "utf-8");

    console.log(`✅ Saved: ${title}`);
}

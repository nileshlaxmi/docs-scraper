import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const LINKS_FILE = path.join(process.cwd(), "chapter-links.txt");
const OUTPUT_DIR = path.join(process.cwd(), "docs");
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// Helper: Clean text
const cleanText = (text) => text.replace(/\s+/g, " ").trim();

// Read links from chapter-links.txt
function getLinksFromFile() {
    const data = fs.readFileSync(LINKS_FILE, "utf-8");
    return data.split("\n").map(line => line.trim()).filter(Boolean);
}

// Scrape each chapter
async function scrapeChapter(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = cleanText($("h1").first().text() || "Untitled");

    let content = `# ${title}\n\n`;

    // Paragraphs & subheadings
    $("h2, h3, p, pre").each((_, el) => {
        const tag = $(el).prop("tagName").toLowerCase();

        if (tag === "h2") {
            content += `## ${cleanText($(el).text())}\n\n`;
        } else if (tag === "h3") {
            content += `### ${cleanText($(el).text())}\n\n`;
        } else if (tag === "p") {
            content += `${cleanText($(el).text())}\n\n`;
        } else if (tag === "pre") {
            content += "```javascript\n" + $(el).text().trim() + "\n```\n\n";
        }
    });

    // Save as Markdown file
    const filename = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    fs.writeFileSync(path.join(OUTPUT_DIR, filename + ".md"), content, "utf-8");

    console.log(`✅ Saved: ${title}`);
}

// Run everything
async function run() {
    try {
        const links = getLinksFromFile();
        console.log(`Found ${links.length} chapters.`);

        for (const link of links) {
            await scrapeChapter(link);
        }

        console.log("🎉 All chapters saved in docs/ folder.");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
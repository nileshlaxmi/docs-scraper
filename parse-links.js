import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const INPUT_FILE = path.join(process.cwd(), "links.html");
const OUTPUT_FILE = path.join(process.cwd(), "chapter-links.txt");
const BASE_URL = "https://www.tutorialspoint.com";

const html = fs.readFileSync(INPUT_FILE, "utf-8");
const $ = cheerio.load(html);

const links = [];

$("ul.toc.chapters li a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("/javascript/")) {
        links.push(BASE_URL + href);
    }
});

// Print links to console
links.forEach(link => console.log(link));

// Optionally, write to a file
fs.writeFileSync(OUTPUT_FILE, links.join("\n"), "utf-8");
console.log(`✅ Saved ${links.length} links to ${OUTPUT_FILE}`);
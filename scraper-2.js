import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { URL } from "url";

const LINKS_FILE = path.join(process.cwd(), "chapter-links.txt");
const OUTPUT_DIR = path.join(process.cwd(), "docs");
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");

// Create directories if they don't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR);
}

// Helper: Clean text
const cleanText = (text) => text.replace(/\s+/g, " ").trim();

// Helper: Download image
async function downloadImage(imageUrl, filename) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'stream' });
        const imagePath = path.join(IMAGES_DIR, filename);
        
        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(imagePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.warn(`Failed to download image: ${imageUrl}`);
        return null;
    }
}

// Helper: Get absolute URL
function getAbsoluteUrl(baseUrl, relativeUrl) {
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch {
        return null;
    }
}

// Helper: Generate unique filename for image
function generateImageFilename(url, index) {
    try {
        const urlObj = new URL(url);
        const extension = path.extname(urlObj.pathname) || '.jpg';
        const basename = path.basename(urlObj.pathname, extension) || `image_${index}`;
        return `${basename}_${Date.now()}${extension}`;
    } catch {
        return `image_${index}_${Date.now()}.jpg`;
    }
}

// Read links from chapter-links.txt
function getLinksFromFile() {
    const data = fs.readFileSync(LINKS_FILE, "utf-8");
    return data.split("\n").map(line => line.trim()).filter(Boolean);
}

// Scrape each chapter
async function scrapeChapter(url) {
    console.log(`Scraping: ${url}`);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = cleanText($("h1").first().text() || "Untitled");
    let content = `# ${title}\n\n`;
    let imageIndex = 0;

    // Process all content elements in order
    const contentElements = $("h2, h3, p, pre, img").get();
    
    for (const el of contentElements) {
        const $el = $(el);
        const tag = $el.prop("tagName").toLowerCase();

        if (tag === "h2") {
            content += `## ${cleanText($el.text())}\n\n`;
        } else if (tag === "h3") {
            content += `### ${cleanText($el.text())}\n\n`;
        } else if (tag === "p") {
            const text = cleanText($el.text());
            if (text) {
                content += `${text}\n\n`;
            }
        } else if (tag === "pre") {
            content += "```javascript\n" + $el.text().trim() + "\n```\n\n";
        } else if (tag === "img") {
            const src = $el.attr("src");
            const alt = $el.attr("alt") || "Image";
            
            if (src) {
                const absoluteUrl = getAbsoluteUrl(url, src);
                if (absoluteUrl) {
                    const filename = generateImageFilename(absoluteUrl, imageIndex++);
                    const downloadedPath = await downloadImage(absoluteUrl, filename);
                    
                    if (downloadedPath) {
                        // Use relative path for markdown
                        const relativePath = `images/${filename}`;
                        content += `![${alt}](${relativePath})\n\n`;
                        console.log(`Downloaded image: ${filename}`);
                    } else {
                        // Fallback to original URL if download failed
                        content += `![${alt}](${absoluteUrl})\n\n`;
                    }
                }
            }
        }
    }

    // Also capture images that might be in specific containers
    $("div.image, figure, .example img, .tutorial img").each(async (_, el) => {
        const $img = $(el).find("img").first();
        if ($img.length === 0) return;
        
        const src = $img.attr("src");
        const alt = $img.attr("alt") || "Additional Image";
        
        if (src) {
            const absoluteUrl = getAbsoluteUrl(url, src);
            if (absoluteUrl) {
                const filename = generateImageFilename(absoluteUrl, imageIndex++);
                const downloadedPath = await downloadImage(absoluteUrl, filename);
                
                if (downloadedPath) {
                    const relativePath = `images/${filename}`;
                    content += `![${alt}](${relativePath})\n\n`;
                    console.log(`Downloaded additional image: ${filename}`);
                }
            }
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
            // Add small delay to be respectful to the server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log("🎉 All chapters saved in docs/ folder.");
        console.log("📸 Images saved in docs/images/ folder.");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
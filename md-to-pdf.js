import fs from "fs";
import path from "path";
import markdownpdf from "markdown-pdf";

const DOCS_DIR = path.join(process.cwd(), "docs");
const PDF_DIR = path.join(process.cwd(), "pdfs");

if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR);
}

const mdFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"));

mdFiles.forEach(mdFile => {
    const inputPath = path.join(DOCS_DIR, mdFile);
    const outputPath = path.join(PDF_DIR, mdFile.replace(/\.md$/, ".pdf"));

    markdownpdf().from(inputPath).to(outputPath, () => {
        console.log(`✅ Saved PDF: ${outputPath}`);
    });
});
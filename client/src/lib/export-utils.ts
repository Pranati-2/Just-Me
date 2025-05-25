import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { extractImagesFromHtml, extractTextFromHtml } from './copy-utils';
import { Document, JournalEntry, Note } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Generate and download a PDF file from content
 * @param title Document title
 * @param content HTML or plain text content
 * @param fileName Output file name without extension
 */
export async function downloadAsPdf(
  title: string, 
  content: string, 
  fileName: string = 'document'
): Promise<void> {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 20, 20);
  
  // Add content
  doc.setFontSize(12);
  let plainText = content;

  // If content is HTML, extract the text
  if (content.includes('<') && content.includes('>')) {
    plainText = extractTextFromHtml(content);
  }
  
  // Split content into lines that fit the page width
  const textLines = doc.splitTextToSize(plainText, 170);
  doc.text(textLines, 20, 30);
  
  // Extract images from HTML content
  if (content.includes('<img')) {
    try {
      const imageUrls = extractImagesFromHtml(content);
      if (imageUrls.length > 0) {
        // We'll only handle the first image for simplicity
        // More complex handling would require positioning logic for multiple images
        const img = new Image();
        img.src = imageUrls[0];
        await new Promise(resolve => {
          img.onload = resolve;
        });
        
        // Calculate aspect ratio and size
        const imgWidth = Math.min(150, img.width / 2);
        const imgHeight = (img.height / img.width) * imgWidth;
        
        // Add image below text (basic positioning)
        const textHeight = textLines.length * 7; // Approximation of text height
        doc.addImage(img, 'JPEG', 20, 30 + textHeight + 10, imgWidth, imgHeight);
      }
    } catch (error) {
      console.error('Error adding images to PDF:', error);
    }
  }
  
  // Save the PDF file
  doc.save(`${fileName}.pdf`);
}

/**
 * Generate and download a Word document from content
 * @param title Document title
 * @param content HTML or plain text content
 * @param fileName Output file name without extension
 */
export async function downloadAsWord(
  title: string, 
  content: string, 
  fileName: string = 'document'
): Promise<void> {
  // Create an array of paragraphs
  const paragraphs = [];
  
  // Add title
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
    })
  );
  
  // Extract content
  let plainText = content;
  let imageUrls: string[] = [];
  
  // If content is HTML, extract text and images
  if (content.includes('<') && content.includes('>')) {
    plainText = extractTextFromHtml(content);
    imageUrls = extractImagesFromHtml(content);
  }
  
  // Split by lines and add paragraphs
  const textLines = plainText.split('\n');
  textLines.forEach(line => {
    if (line.trim()) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun(line.trim())
          ]
        })
      );
    }
  });
  
  // Add images if available - this is simplified as ImageRun with transformation has issues
  if (imageUrls.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: "[Images are not fully supported in this document format]",
        style: "aside",
      })
    );
  }
  
  // Create document
  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
  
  // Generate and save the document
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${fileName}.docx`);
  });
}

/**
 * Export content to the specified format and download it
 * @param title Document title
 * @param content HTML or plain text content
 * @param format Export format ('pdf' or 'docx')
 * @param fileName Output file name without extension
 */
export async function exportContent(
  title: string,
  content: string,
  format: 'pdf' | 'docx',
  fileName: string = 'document'
): Promise<void> {
  if (format === 'pdf') {
    await downloadAsPdf(title, content, fileName);
  } else if (format === 'docx') {
    await downloadAsWord(title, content, fileName);
  }
}

/**
 * Export a document to PDF format
 * @param doc Document object
 */
export async function exportDocumentToPdf(doc: Document): Promise<void> {
  const fileName = doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const content = doc.formattedContent?.html || doc.content;
  await downloadAsPdf(doc.title, content, fileName);
}

/**
 * Export a document to DOCX format
 * @param doc Document object
 */
export async function exportDocumentToDocx(doc: Document): Promise<void> {
  const fileName = doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const content = doc.formattedContent?.html || doc.content;
  await downloadAsWord(doc.title, content, fileName);
}

/**
 * Export a journal entry to PDF format
 * @param entry Journal entry object
 */
export async function exportJournalToPdf(entry: JournalEntry): Promise<void> {
  const fileName = `journal_${format(new Date(entry.date), 'yyyy_MM_dd')}`;
  const content = entry.formattedContent?.html || entry.content;
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add title
  doc.setFontSize(18);
  doc.text(entry.title, 20, 20);
  
  // Add date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(format(new Date(entry.date), 'EEEE, MMMM d, yyyy'), 20, 30);
  
  // Add mood and weather if available
  let yPos = 40;
  if (entry.mood || entry.weather || entry.location) {
    let infoText = '';
    if (entry.mood) infoText += `Mood: ${entry.mood}   `;
    if (entry.weather) infoText += `Weather: ${entry.weather}   `;
    if (entry.location) infoText += `Location: ${entry.location}`;
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(infoText, 20, yPos);
    yPos += 10;
  }
  
  // Add content
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  let plainText = content;

  // If content is HTML, extract the text
  if (content.includes('<') && content.includes('>')) {
    plainText = extractTextFromHtml(content);
  }
  
  // Split content into lines that fit the page width
  const textLines = doc.splitTextToSize(plainText, 170);
  doc.text(textLines, 20, yPos);
  
  // Add tags at the bottom if available
  if (entry.tags && entry.tags.length > 0) {
    const tagsText = `Tags: ${entry.tags.join(', ')}`;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    // Position tags at the bottom of the page
    doc.text(tagsText, 20, 280);
  }
  
  // Save the PDF file
  doc.save(`${fileName}.pdf`);
}

/**
 * Export a journal entry to DOCX format
 * @param entry Journal entry object
 */
export async function exportJournalToDocx(entry: JournalEntry): Promise<void> {
  const fileName = `journal_${format(new Date(entry.date), 'yyyy_MM_dd')}`;
  const content = entry.formattedContent?.html || entry.content;
  
  // Create an array of paragraphs
  const paragraphs = [];
  
  // Add title
  paragraphs.push(
    new Paragraph({
      text: entry.title,
      heading: HeadingLevel.HEADING_1,
    })
  );
  
  // Add date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: format(new Date(entry.date), 'EEEE, MMMM d, yyyy'),
          color: '666666',
        })
      ]
    })
  );
  
  // Add mood, weather, location if available
  if (entry.mood || entry.weather || entry.location) {
    let infoText = '';
    if (entry.mood) infoText += `Mood: ${entry.mood}   `;
    if (entry.weather) infoText += `Weather: ${entry.weather}   `;
    if (entry.location) infoText += `Location: ${entry.location}`;
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: infoText,
            color: '888888',
            size: 20,
          })
        ]
      })
    );
  }
  
  // Add a separator
  paragraphs.push(new Paragraph({}));
  
  // Extract content
  let plainText = content;
  
  // If content is HTML, extract text
  if (content.includes('<') && content.includes('>')) {
    plainText = extractTextFromHtml(content);
  }
  
  // Split by lines and add paragraphs
  const textLines = plainText.split('\n');
  textLines.forEach(line => {
    if (line.trim()) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun(line.trim())
          ]
        })
      );
    }
  });
  
  // Add tags if available
  if (entry.tags && entry.tags.length > 0) {
    paragraphs.push(new Paragraph({}));
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Tags: ${entry.tags.join(', ')}`,
            color: '666666',
            size: 20,
          })
        ]
      })
    );
  }
  
  // Create document
  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
  
  // Generate and save the document
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${fileName}.docx`);
  });
}

/**
 * Export a note to PDF format
 * @param note Note object
 */
export async function exportNoteToPdf(note: Note): Promise<void> {
  const fileName = `note_${note.id}`;
  const content = note.formattedContent?.html || note.content;
  await downloadAsPdf(note.title, content, fileName);
}

/**
 * Export a note to DOCX format
 * @param note Note object
 */
export async function exportNoteToDocx(note: Note): Promise<void> {
  const fileName = `note_${note.id}`;
  const content = note.formattedContent?.html || note.content;
  await downloadAsWord(note.title, content, fileName);
}